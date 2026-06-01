import { createPublicClient, http, parseAbi } from 'viem';
import { arbitrumSepolia } from 'viem/chains';

/**
 * Diagnose the `0x7d4f826b` (NotInsuranceManager()) coverage-purchase revert.
 *
 * `ConfidentialEscrow` and `ConfidentialCoverageManager` are Reineira CORE contracts
 * (PROVA only deploys plugins). During `purchaseCoverage`, the CCM calls
 * `escrow.setUnderwriterFee(...)`, which is gated `onlyInsuranceManager`. If the escrow's
 * registered insurance manager is not the CCM, that call reverts `NotInsuranceManager()`
 * (selector 0x7d4f826b) — which surfaces as the UserOp simulation failure.
 *
 * The deployed escrow exposes NO `insuranceManager()` getter and CoFHE functions cannot be
 * simulated via eth_call, so we cannot read the manager value directly. We instead verify the
 * one direction that IS readable (CCM -> escrow) and surface the owner-gated remediation.
 */
const ESCROW = '0xbe1eEB78504B71beEE1b33D3E3D367A2F9a549A6';
const CCM = '0x40A3A53d54D25cF079Bc9C2033224159d4EA3A67';

const CCM_ABI = parseAbi(['function escrow() view returns (address)']);
const OWNABLE = parseAbi(['function owner() view returns (address)']);

async function main() {
  const client = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(process.env.ARBITRUM_SEPOLIA_RPC_URL ?? 'https://sepolia-rollup.arbitrum.io/rpc'),
  });

  const ccmEscrow = await client.readContract({ address: CCM, abi: CCM_ABI, functionName: 'escrow' });
  const escrowOwner = await client.readContract({ address: ESCROW, abi: OWNABLE, functionName: 'owner' });

  const forwardOk = ccmEscrow.toLowerCase() === ESCROW.toLowerCase();

  console.log('CCM.escrow()        :', ccmEscrow, forwardOk ? '✓ (points at escrow)' : '✗ MISMATCH');
  console.log('Escrow owner        :', escrowOwner);
  console.log('Expected manager    :', CCM, '(the CCM)');
  console.log('');
  console.log('The coverage flow reverts 0x7d4f826b = NotInsuranceManager().');
  console.log('That error can only be raised by escrow.setUnderwriterFee when its caller (the CCM)');
  console.log('is NOT the escrow\'s registered insuranceManager. The deployed escrow has no getter');
  console.log('to read the manager, but the live revert proves: escrow.insuranceManager != CCM.');
  console.log('');
  console.log('REMEDIATION (escrow is Reineira-owned — must be sent by the owner above):');
  console.log(`  cast send ${ESCROW} "setInsuranceManager(address)" ${CCM} \\`);
  console.log('    --rpc-url "$ARBITRUM_SEPOLIA_RPC_URL" --private-key "$ESCROW_OWNER_KEY"');
  console.log('');
  console.log('PROVA\'s deploy key (0xa4280dd3…0317) does NOT own this escrow, so PROVA cannot run it.');
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
