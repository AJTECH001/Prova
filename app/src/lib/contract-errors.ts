/**
 * Central registry of all known on-chain error selectors.
 *
 * Every revert that reaches the frontend or backend must be routed through
 * `decodeError`. Adding a new selector here is the ONLY change required to
 * give users and operators a human-readable message for that error.
 */

import { decodeAbiParameters, type Hex } from 'viem';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ErrorSeverity = 'user' | 'admin' | 'infrastructure';

export interface DecodedContractError {
  selector: string;
  name: string;
  /** User-facing copy — safe to display directly in UI */
  message: string;
  /** Dev/ops detail — log it, don't show to end-users */
  detail: string;
  /** ABI-decoded parameters when available */
  args?: Record<string, unknown>;
  /** True → user can retry after a moment; False → needs intervention */
  recoverable: boolean;
  /** Who needs to act to resolve this */
  severity: ErrorSeverity;
  /** Machine-readable action for monitoring/alerting */
  adminAction?: string;
}

// ─── Error Registry ───────────────────────────────────────────────────────────

type RegistryEntry = Omit<DecodedContractError, 'selector' | 'args'>;

const REGISTRY: Record<string, RegistryEntry> = {
  // Reineira: CCM.purchaseCoverage calls PoolFactory.isPool(pool) → false.
  // Pool was not created by the canonical ConfidentialPoolFactory (or factory was redeployed).
  // Params: (bytes32 poolId, address caller)
  '0x4d13139e': {
    name: 'InvalidPool',
    message: 'The insurance pool is not authorized. Please contact support.',
    detail:
      'ConfidentialPoolFactory.isPool(pool) returned false. ' +
      'Pool was not created by the canonical factory, or factory was redeployed after pool creation. ' +
      'Run scripts/repair-pool.ts to deploy a new pool via the current factory.',
    recoverable: false,
    severity: 'infrastructure',
    adminAction: 'repair-pool: run ConfidentialPoolFactory.createPool(cUSDC) and update POOL_ADDRESS',
  },

  // Coverage already purchased for this escrowId — duplicate call
  '0xe2e43053': {
    name: 'CoverageAlreadyPurchased',
    message: 'Coverage has already been purchased for this escrow. Refresh to see the updated status.',
    detail: 'Duplicate purchaseCoverage call for the same escrowId.',
    recoverable: false,
    severity: 'user',
  },

  // On-chain invoice hash collision — same buyer + amount + due date
  '0x3aadb858': {
    name: 'InvoiceConflict',
    message: 'Invoice conflict detected on-chain. To create a new one, change the due date.',
    detail: 'ConfidentialEscrow: duplicate create() call with same invoice parameters.',
    recoverable: false,
    severity: 'user',
  },

  // Policy not whitelisted in pool — addPolicy not called yet
  '0xd06b96b1': {
    name: 'PolicyNotApproved',
    message: 'Policy not approved by the insurance pool. Please try again in a few seconds.',
    detail: 'InsurancePool.isPolicy(policy) == false. Call InsurancePool.addPolicy(policyAddress).',
    recoverable: true,
    severity: 'admin',
    adminAction: 'call InsurancePool.addPolicy(policyAddress) — PolicyAdminService.ensurePolicyReady()',
  },

  // concentrationCaps[debtorId] == 0 on TradeCreditInsurancePolicy
  '0xea7a154b': {
    name: 'ConcentrationCapNotSet',
    message: 'Buyer credit limit not configured. Please try again in a few seconds.',
    detail: 'TradeCreditInsurancePolicy.concentrationCaps[debtorId] == 0.',
    recoverable: true,
    severity: 'admin',
    adminAction: 'call TradeCreditInsurancePolicy.setConcentrationCap(debtorId, cap)',
  },

  // ConfidentialEscrow has no record for this escrowId
  '0x1fa47a1c': {
    name: 'EscrowNotOnChain',
    message: 'The escrow is not confirmed on-chain yet. Wait a moment and try again.',
    detail: 'ConfidentialEscrow: escrowId lookup returned empty struct.',
    recoverable: true,
    severity: 'user',
  },

  // onPolicySet was not called / failed for this coverageId
  '0xaa0b79a6': {
    name: 'PolicyDataMissing',
    message: 'Policy data not found on-chain. Please try again.',
    detail: 'TradeCreditInsurancePolicy.onPolicySet not yet called for this coverageId.',
    recoverable: true,
    severity: 'admin',
  },

  // ConfidentialPolicyRegistry does not know this policy address
  '0xf3e14ae5': {
    name: 'PolicyNotRegistered',
    message: 'Policy not registered in the protocol registry. Please try again in a moment.',
    detail: 'ConfidentialPolicyRegistry.isPolicy(policy) == false.',
    recoverable: true,
    severity: 'admin',
    adminAction: 'call ConfidentialPolicyRegistry.registerPolicy(policyAddress)',
  },

  // OracleDebtorProof: debtorId has no valid score stored — oracle hasn't called setScore yet.
  // Fix: ensure backend ORACLE_DEBTOR_PROOF_ADDRESS is set and ensureDebtorRegistered ran.
  '0x883c6518': {
    name: 'ScoreNotSet',
    message: 'Credit score not yet registered for this buyer. Please try again in a few seconds.',
    detail: 'OracleDebtorProof.getScore: no valid CoFHE-sealed score stored for this debtorId.',
    recoverable: true,
    severity: 'admin',
    adminAction: 'run scripts/set-oracle-score.ts OR ensure backend ORACLE_DEBTOR_PROOF_ADDRESS is set and ensureDebtorRegistered called setScore',
  },

  // MockDebtorProof: production guard triggered — MockDebtorProof is still wired on live network.
  // Fix: run scripts/upgrade-policy.ts to deploy OracleDebtorProof and upgrade policy proxy.
  '0xc2970dd1': {
    name: 'MockAdapterOnLiveNetwork',
    message: 'Credit scoring adapter not properly configured. Please contact support.',
    detail: 'MockDebtorProof.getScore: production guard triggered — MockDebtorProof is wired on a live network. Run scripts/upgrade-policy.ts.',
    recoverable: false,
    severity: 'infrastructure',
    adminAction: 'run scripts/upgrade-policy.ts to deploy OracleDebtorProof and upgrade the policy proxy',
  },

  // ─── ERC-4337 EntryPoint v0.7 ─────────────────────────────────────────────

  '0x220266b6': {
    name: 'EntryPointFailedOp',
    message: 'Transaction validation failed. Please try again.',
    detail: 'EntryPoint.FailedOp(uint256 opIndex, string reason)',
    recoverable: true,
    severity: 'infrastructure',
  },

  // ─── PROVA / Reineira Custom Errors ───────────────────────────────────────

  // msg.sender != protocolCaller in UnderwriterPolicy
  '0x19729203': {
    name: 'UnauthorizedPolicyCaller',
    message: 'The policy contract did not recognize the coverage manager. The system is automatically repairing this — please try again in a few seconds.',
    detail: 'UnderwriterPolicy: msg.sender != boundManager. Check PolicyAdminService.ensureManagerWhitelisted().',
    recoverable: true,
    severity: 'infrastructure',
    adminAction: 'Verify that ADMIN_PRIVATE_KEY owns the policy contract and that CCM_ADDRESS is whitelisted.',
  },

  // msg.sender is not whitelisted in Moat Registry (P5)
  '0x10a01192': {
    name: 'NotAProvaContract',
    message: 'Security validation failed: The coverage manager is not whitelisted in the policy contract.',
    detail: 'TestnetCoreBase: msg.sender is not whitelisted in _allowedContracts. Backend will attempt to repair this automatically.',
    recoverable: true,
    severity: 'infrastructure',
    adminAction: 'Run PolicyAdminService.ensureManagerWhitelisted() or manually call setAllowedContract(CCM, true).',
  },
};

// ─── Parameter Decoders ───────────────────────────────────────────────────────

type DecodeFn = (data: Hex) => Record<string, unknown>;

const PARAM_DECODERS: Record<string, DecodeFn> = {
  '0x4d13139e': (data) => {
    try {
      const params = `0x${data.slice(10)}` as Hex;
      const [poolId, caller] = decodeAbiParameters(
        [{ type: 'bytes32' }, { type: 'address' }],
        params,
      );
      return { poolId, caller };
    } catch {
      return {};
    }
  },
};

// ─── Public API ───────────────────────────────────────────────────────────────

/** Extract the first 4-byte hex selector from any message string */
export function extractSelector(input: string): string | null {
  const m = input.match(/0x[0-9a-fA-F]{8}/);
  return m ? m[0].toLowerCase() : null;
}

/**
 * Decode a raw revert hex string (e.g. "0x4d13139e...") into a structured error.
 * Returns an UnknownError entry for unrecognised selectors.
 */
export function decodeRevert(raw: string): DecodedContractError {
  const lower = raw.toLowerCase();
  const selector = lower.startsWith('0x') ? lower.slice(0, 10) : `0x${lower.slice(0, 8)}`;

  const entry = REGISTRY[selector];
  if (!entry) {
    return {
      selector,
      name: 'UnknownContractError',
      message: 'An unexpected error occurred. Please try again or contact support.',
      detail: `Unknown selector ${selector}. Raw data: ${raw.slice(0, 120)}`,
      recoverable: false,
      severity: 'infrastructure',
    };
  }

  let args: Record<string, unknown> | undefined;
  const decoder = PARAM_DECODERS[selector];
  if (decoder) {
    try {
      args = decoder(raw as Hex);
    } catch {
      // decode failure is non-fatal — registry entry is still returned
    }
  }

  return { selector, ...entry, ...(args ? { args } : {}) };
}

/**
 * Decode any thrown value (Error, string, unknown) into a structured error.
 * Primary entry point for all catch blocks in the coverage flow.
 */
export function decodeError(e: unknown): DecodedContractError {
  const msg = e instanceof Error ? e.message : String(e);
  const selector = extractSelector(msg);

  if (selector) {
    const idx = msg.indexOf(selector);
    // Pass the full hex from the selector onwards for param decoding
    const raw = msg.slice(idx).split(/\s/)[0];
    return decodeRevert(raw.length < 10 ? selector : raw);
  }

  return {
    selector: '0x00000000',
    name: 'GenericError',
    message: msg || 'Unknown error',
    detail: msg,
    recoverable: false,
    severity: 'user',
  };
}

/** True if this error selector is in our registry */
export function isKnownError(selector: string): boolean {
  return selector.toLowerCase() in REGISTRY;
}
