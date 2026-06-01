import { useCallback, useState } from 'react';
import { encodeFunctionData, parseEventLogs } from 'viem';
import { fheService } from '@/services/FheService';
import { useWalletStore } from '@/stores/wallet-store';
import { publicClient } from '@/lib/public-client';
import { cUSDCABI, ADDRESSES } from '@/lib/contracts';

export type UnshieldPhase = 'idle' | 'working' | 'done' | 'error';

export interface UnshieldState {
  phase: UnshieldPhase;
  statusLabel: string;
  error: string | null;
  txHash: string | null;
}

const INITIAL: UnshieldState = {
  phase: 'idle',
  statusLabel: '',
  error: null,
  txHash: null,
};

export function useUnshieldFlow() {
  const [state, setState] = useState<UnshieldState>(INITIAL);

  const execute = useCallback(async (walletAddress: string, amount: bigint) => {
    setState({ phase: 'working', statusLabel: 'Encrypting amount…', error: null, txHash: null });

    try {
      const walletStore = useWalletStore.getState();
      await walletStore.ensureConnected();

      // ── Phase 1: encrypt amount → unshield (burns cUSDC, creates pending claim) ──
      await fheService.initialize(walletAddress);
      const enc = await fheService.encryptUint64(amount);
      const inEuint64 = {
        ctHash:       BigInt(enc.data),
        securityZone: enc.securityZone,
        utype:        enc.utype,
        signature:    enc.inputProof as `0x${string}`,
      };

      setState((s) => ({ ...s, statusLabel: 'Submitting transaction…' }));

      const phase1Data = encodeFunctionData({
        abi: cUSDCABI,
        functionName: 'unshield',
        args: [walletAddress as `0x${string}`, walletAddress as `0x${string}`, inEuint64],
      });

      const phase1TxHash = await walletStore.sendUserOperation([{
        to: ADDRESSES.cUSDC,
        data: phase1Data,
      }]);

      setState((s) => ({ ...s, statusLabel: 'Waiting for confirmation…' }));

      const receipt = await publicClient.getTransactionReceipt({
        hash: phase1TxHash as `0x${string}`,
      });

      const unshieldEvents = parseEventLogs({
        abi: cUSDCABI,
        logs: receipt.logs,
        eventName: 'Unshielded',
      });

      if (unshieldEvents.length === 0) {
        throw new Error('Unshielded event not found — transaction may have reverted');
      }

      const ctHashBytes32 = unshieldEvents[0].args.amount as `0x${string}`;

      // ── Phase 2: CoFHE threshold decrypt → claimUnshielded (mints USDC) ──
      setState((s) => ({ ...s, statusLabel: 'Decrypting via threshold network…' }));

      const { decryptedValue, signature } = await fheService.decryptForTx(ctHashBytes32);

      setState((s) => ({ ...s, statusLabel: 'Completing claim…' }));

      const phase2Data = encodeFunctionData({
        abi: cUSDCABI,
        functionName: 'claimUnshielded',
        args: [ctHashBytes32, decryptedValue, signature],
      });

      const phase2TxHash = await walletStore.sendUserOperation([{
        to: ADDRESSES.cUSDC,
        data: phase2Data,
      }]);

      setState({ phase: 'done', statusLabel: '', error: null, txHash: phase2TxHash });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unshield failed';
      setState((s) => ({ ...s, phase: 'error', statusLabel: '', error: message }));
    }
  }, []);

  const reset = useCallback(() => setState(INITIAL), []);

  return { state, execute, reset };
}
