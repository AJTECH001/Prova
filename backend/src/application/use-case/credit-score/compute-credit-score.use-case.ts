import type { IEscrowRepository } from '../../../domain/escrow/repository/escrow.repository.js';
import type { ICreditScoreFheService } from '../../../infrastructure/fhe/fhe.service.js';
import type { EncryptedValue } from '../../../domain/fhe/model/encrypted-value.js';
import { EscrowStatus } from '../../../domain/escrow/model/escrow-status.enum.js';
import type { Escrow } from '../../../domain/escrow/model/escrow.js';

export interface CreditScoreResult {
  userId: string;
  rawScore: number;
  encryptedScore: EncryptedValue;
  riskProof: string;
}

export class ComputeCreditScoreUseCase {
  constructor(
    private readonly escrowRepository: IEscrowRepository,
    private readonly fheService: ICreditScoreFheService,
  ) {}

  async execute(userId: string, buyerWalletAddress: string): Promise<CreditScoreResult> {
    const escrows = await this.escrowRepository.findSettledByUserId(userId);

    const rawScore = this.computeScore(escrows);

    const encryptedScore = await this.fheService.encryptCreditScore(BigInt(rawScore), buyerWalletAddress);

    // ABI-encode as (bytes, int32, uint8, bytes) matching InEuint32 struct on-chain
    const riskProof = this.encodeRiskProof(encryptedScore);

    return { userId, rawScore, encryptedScore, riskProof };
  }

  private computeScore(escrows: Escrow[]): number {
    if (escrows.length === 0) return 500; // neutral score for new buyers

    const total = escrows.length;
    const settled = escrows.filter((e) => e.status === EscrowStatus.SETTLED);
    const defaults = escrows.filter(
      (e) => e.status === EscrowStatus.EXPIRED || e.status === EscrowStatus.FAILED,
    );

    // Signal 1 — Payment rate (0-400 pts)
    const paymentRate = settled.length / total;
    const paymentScore = Math.round(paymentRate * 400);

    // Signal 2 — DSO: avg days between deadline and settledAt (0-300 pts)
    const dsoScore = this.computeDsoScore(settled);

    // Signal 3 — Volume: total settled amount normalised to 150 pts cap
    const totalVolume = settled.reduce((sum, e) => sum + e.amount, 0);
    const volumeScore = Math.min(Math.round((totalVolume / 100000) * 150), 150);

    // Signal 4 — Default rate penalty (0-100 pts)
    const defaultRate = defaults.length / total;
    const defaultScore = Math.round((1 - defaultRate) * 100);

    // Signal 5 — Tenure: number of completed escrows as proxy (0-50 pts, caps at 20)
    const tenureScore = Math.min(Math.round((settled.length / 20) * 50), 50);

    const raw = paymentScore + dsoScore + volumeScore + defaultScore + tenureScore;
    return Math.min(Math.max(raw, 0), 1000);
  }

  private computeDsoScore(settled: Escrow[]): number {
    const withDso = settled.filter((e) => e.deadline && e.settledAt);
    if (withDso.length === 0) return 150; // no deadline data — neutral

    const avgDsoDays =
      withDso.reduce((sum, e) => {
        const diffMs = e.settledAt!.getTime() - e.deadline!.getTime();
        return sum + diffMs / (1000 * 60 * 60 * 24);
      }, 0) / withDso.length;

    // paid early (negative DSO) → 300 pts, paid 30+ days late → 0 pts
    if (avgDsoDays <= 0) return 300;
    if (avgDsoDays >= 30) return 0;
    return Math.round((1 - avgDsoDays / 30) * 300);
  }

  private encodeRiskProof(encrypted: EncryptedValue): string {
    // Encodes matching the InEuint32 struct: (bytes data, int32 securityZone, uint8 utype, bytes inputProof)
    const dataHex = encrypted.data.startsWith('0x') ? encrypted.data.slice(2) : encrypted.data;
    const proofHex = encrypted.inputProof.startsWith('0x')
      ? encrypted.inputProof.slice(2)
      : encrypted.inputProof;

    const securityZoneHex = encrypted.securityZone.toString(16).padStart(8, '0');
    const utypeHex = encrypted.utype.toString(16).padStart(2, '0');

    return `0x${dataHex}${securityZoneHex}${utypeHex}${proofHex}`;
  }
}
