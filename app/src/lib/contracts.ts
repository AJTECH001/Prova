// ─── Deployed contract addresses ────────────────────────────────────────────
// Source: contracts/deployments/arb-sepolia.json  (chainId 421614, deployed 2026-05-01)

export const CHAIN_ID = 421614; // Arbitrum Sepolia

// Mirrors TradeInvoiceResolver.MIN_WAITING_PERIOD (30 days in ms)
export const MIN_WAITING_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export const ADDRESSES = {
  // PROVA contracts
  TradeInvoiceResolver:       '0xfca7715a2C38E13Ecfa2f934E4B70758d0304738',
  TradeCreditInsurancePolicy: '0xf131E7A869Ce4Ff54A7cdA9eC966576A9604B2b5',
  DebtorExposureRegistry:     '0xe3b6a9E4BDF597899e79D13C4f73B16dff610fBE',
  InsuranceClaimsRegistry:    '0x69e4fce78B3E1A4582FF2e35C51EA4364CB5D5dA',
  MockDebtorProof:            '0x817A8DA1e6B5A7E45Dcf3784870d82C3E67F1576',
  // Reineira core contracts redeployed 
  ConfidentialEscrow:          '0xbe1eEB78504B71beEE1b33D3E3D367A2F9a549A6',
  ConfidentialCoverageManager: '0x40A3A53d54D25cF079Bc9C2033224159d4EA3A67',
  PoolFactory:                 '0xCBD3815244ee96a92B3Ca3C71B6eD9acB3661e80',
  PolicyRegistry:              '0x962A6c7Be4fC765B0E8B601ab4BB210938660190',
  cUSDC:                       '0x42E47f9bA89712C317f60A72C81A610A2b68c48a',
  USDC:                        '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
} as const;

// ─── ABIs ────────────────────────────────────────────────────────────────────
// Sourced from: contracts/src/resolvers/TradeInvoiceResolver.sol
//               contracts/src/policies/TradeCreditInsurancePolicy.sol
//               contracts/src/registries/DebtorExposureRegistry.sol
//               contracts/src/registries/InsuranceClaimsRegistry.sol

export const TradeInvoiceResolverABI = [
  // errors
  { name: 'ConditionAlreadySet',     inputs: [{ name: 'escrowId',    type: 'uint256' }], type: 'error' },
  { name: 'ConditionNotSet',         inputs: [{ name: 'escrowId',    type: 'uint256' }], type: 'error' },
  { name: 'UnauthorizedCaller',      inputs: [{ name: 'escrowId',    type: 'uint256' }], type: 'error' },
  { name: 'InvoiceAlreadyRegistered',inputs: [{ name: 'invoiceHash', type: 'bytes32' }], type: 'error' },
  { name: 'InvalidAmount',           inputs: [], type: 'error' },
  { name: 'InvalidBuyer',            inputs: [], type: 'error' },
  { name: 'InvalidDueDate',          inputs: [], type: 'error' },
  { name: 'InvalidSeller',           inputs: [], type: 'error' },
  { name: 'InvalidWaitingPeriod',    inputs: [], type: 'error' },
  { name: 'NotAProvaContract',       inputs: [], type: 'error' },
  { name: 'ZeroAddress',             inputs: [], type: 'error' },
  // events
  {
    name: 'ConditionSet',
    anonymous: false,
    inputs: [{ indexed: true, name: 'escrowId', type: 'uint256' }],
    type: 'event',
  },
  {
    name: 'EscrowContractSet',
    anonymous: false,
    inputs: [{ indexed: true, name: 'caller', type: 'address' }],
    type: 'event',
  },
  // constants
  {
    name: 'MIN_WAITING_PERIOD',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'MAX_WAITING_PERIOD',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // state
  {
    name: 'escrowContract',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  // IConditionResolver
  {
    name: 'isConditionMet',
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'onConditionSet',
    inputs: [
      { name: 'escrowId', type: 'uint256' },
      { name: 'data',     type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // admin
  {
    name: 'initialize',
    inputs: [
      { name: 'initialOwner',   type: 'address' },
      { name: '_escrowContract', type: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'setEscrowContract',
    inputs: [{ name: '_escrowContract', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'isAllowedContract',
    inputs: [{ name: 'addr', type: 'address' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'owner',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'supportsInterface',
    inputs: [{ name: 'interfaceId', type: 'bytes4' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'transferOwnership',
    inputs: [{ name: 'newOwner', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'upgradeToAndCall',
    inputs: [
      { name: 'newImplementation', type: 'address' },
      { name: 'data',              type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

export const TradeCreditInsurancePolicyABI = [
  // errors
  { name: 'ConcentrationCapNotSet',  inputs: [{ name: 'debtorId',   type: 'bytes32' }], type: 'error' },
  { name: 'PolicyAlreadySet',        inputs: [{ name: 'coverageId', type: 'uint256' }], type: 'error' },
  { name: 'PolicyNotSet',            inputs: [{ name: 'coverageId', type: 'uint256' }], type: 'error' },
  { name: 'UnauthorizedCaller',      inputs: [{ name: 'coverageId', type: 'uint256' }], type: 'error' },
  { name: 'InvalidAddonBps',         inputs: [], type: 'error' },
  { name: 'InvalidCoveragePercentage', inputs: [], type: 'error' },
  { name: 'InvalidCreditLimit',      inputs: [], type: 'error' },
  { name: 'InvalidCurve',            inputs: [], type: 'error' },
  { name: 'InvalidInvoiceAmount',    inputs: [], type: 'error' },
  { name: 'NotAProvaContract',       inputs: [], type: 'error' },
  { name: 'ZeroAddress',             inputs: [], type: 'error' },
  // events
  {
    name: 'PolicySet',
    anonymous: false,
    inputs: [{ indexed: true, name: 'coverageId', type: 'uint256' }],
    type: 'event',
  },
  {
    name: 'CurveUpdated',
    anonymous: false,
    inputs: [{ indexed: false, name: 'newVersion', type: 'uint16' }],
    type: 'event',
  },
  {
    name: 'CountryRiskSet',
    anonymous: false,
    inputs: [
      { indexed: true,  name: 'countryCode', type: 'bytes2' },
      { indexed: false, name: 'bps',         type: 'uint16' },
    ],
    type: 'event',
  },
  {
    name: 'IndustryRiskSet',
    anonymous: false,
    inputs: [
      { indexed: true,  name: 'industryCode', type: 'bytes4' },
      { indexed: false, name: 'bps',          type: 'uint16' },
    ],
    type: 'event',
  },
  {
    name: 'ProtocolCallerSet',
    anonymous: false,
    inputs: [{ indexed: true, name: 'caller', type: 'address' }],
    type: 'event',
  },
  {
    name: 'ClaimLogFailed',
    anonymous: false,
    inputs: [{ indexed: true, name: 'coverageId', type: 'uint256' }],
    type: 'event',
  },
  // state
  {
    name: 'curveVersion',
    inputs: [],
    outputs: [{ type: 'uint16' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'debtorProofAdapter',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'exposureRegistry',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'lossHistory',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'protocolCaller',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  // IUnderwriterPolicy
  {
    name: 'onPolicySet',
    inputs: [
      { name: 'coverageId', type: 'uint256' },
      { name: 'data',       type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'evaluateRisk',
    inputs: [
      { name: 'coverageId', type: 'uint256' },
      { name: '',           type: 'bytes' },
    ],
    outputs: [{ name: 'riskScore', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'judge',
    inputs: [
      { name: 'coverageId',   type: 'uint256' },
      { name: 'disputeProof', type: 'bytes' },
    ],
    outputs: [{ name: 'valid', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // admin
  {
    name: 'initialize',
    inputs: [
      { name: 'initialOwner',       type: 'address' },
      { name: '_debtorProofAdapter', type: 'address' },
      { name: '_exposureRegistry',   type: 'address' },
      { name: '_lossHistory',        type: 'address' },
      { name: '_protocolCaller',     type: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'setCurve',
    inputs: [
      { name: 'thresholds', type: 'uint32[6]' },
      { name: 'premiums',   type: 'uint32[6]' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'setCountryRisk',
    inputs: [
      { name: 'countryCode', type: 'bytes2' },
      { name: 'bps',         type: 'uint16' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'setIndustryRisk',
    inputs: [
      { name: 'industryCode', type: 'bytes4' },
      { name: 'bps',          type: 'uint16' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'setConcentrationCap',
    inputs: [
      { name: 'debtorId', type: 'bytes32' },
      { name: 'cap',      type: 'uint64' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'setProtocolCaller',
    inputs: [{ name: 'caller', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'isAllowedContract',
    inputs: [{ name: 'addr', type: 'address' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'supportsInterface',
    inputs: [{ name: 'interfaceId', type: 'bytes4' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'owner',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'transferOwnership',
    inputs: [{ name: 'newOwner', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'upgradeToAndCall',
    inputs: [
      { name: 'newImplementation', type: 'address' },
      { name: 'data',              type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

export const DebtorExposureRegistryABI = [
  // errors
  { name: 'NotAProvaContract',     inputs: [], type: 'error' },
  { name: 'NotRegisteredContract', inputs: [], type: 'error' },
  // events
  {
    name: 'ContractRegistered',
    anonymous: false,
    inputs: [{ indexed: true, name: 'prova', type: 'address' }],
    type: 'event',
  },
  {
    name: 'ContractDeregistered',
    anonymous: false,
    inputs: [{ indexed: true, name: 'prova', type: 'address' }],
    type: 'event',
  },
  // writer API
  {
    name: 'addExposure',
    inputs: [
      { name: 'debtorId',       type: 'bytes32' },
      { name: 'poolId',         type: 'address' },
      { name: 'amount',         type: 'bytes32' },  // euint64
      { name: 'globalCapPlain', type: 'uint64' },
    ],
    outputs: [{ name: 'ok', type: 'bytes32' }],     // ebool
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'reduceExposure',
    inputs: [
      { name: 'debtorId', type: 'bytes32' },
      { name: 'amount',   type: 'bytes32' }, // euint64
    ],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // admin
  {
    name: 'initialize',
    inputs: [{ name: 'initialOwner', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'registerContract',
    inputs: [{ name: 'prova', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'deregisterContract',
    inputs: [{ name: 'prova', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'isRegistered',
    inputs: [{ name: 'addr', type: 'address' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'isAllowedContract',
    inputs: [{ name: 'addr', type: 'address' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'owner',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'transferOwnership',
    inputs: [{ name: 'newOwner', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'upgradeToAndCall',
    inputs: [
      { name: 'newImplementation', type: 'address' },
      { name: 'data',              type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

export const InsuranceClaimsRegistryABI = [
  // errors
  { name: 'NotAProvaContract', inputs: [], type: 'error' },
  // events
  {
    name: 'PolicyRegistered',
    anonymous: false,
    inputs: [{ indexed: true, name: 'policy', type: 'address' }],
    type: 'event',
  },
  // writer API
  {
    name: 'logClaim',
    inputs: [
      { name: 'coverageId',     type: 'uint256' },
      { name: 'version',        type: 'uint32' },
      { name: 'encClaimAmount', type: 'bytes32' }, // euint64
    ],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // read API
  {
    name: 'recordsForCurve',
    inputs: [
      { name: 'version', type: 'uint32' },
      { name: 'cursor',  type: 'uint256' },
      { name: 'limit',   type: 'uint256' },
    ],
    outputs: [
      {
        type: 'tuple[]',
        components: [
          { name: 'coverageId',     type: 'uint256' },
          { name: 'encClaimAmount', type: 'bytes32' },
          { name: 'timestamp',      type: 'uint256' },
          { name: 'curveVersion',   type: 'uint32' },
        ],
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // admin
  {
    name: 'initialize',
    inputs: [{ name: 'initialOwner', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'registerPolicy',
    inputs: [{ name: 'policy', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'isAllowedContract',
    inputs: [{ name: 'addr', type: 'address' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'owner',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'transferOwnership',
    inputs: [{ name: 'newOwner', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'upgradeToAndCall',
    inputs: [
      { name: 'newImplementation', type: 'address' },
      { name: 'data',              type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

export const MockDebtorProofABI = [
  {
    name: 'getScore',
    inputs: [{ name: 'debtorId', type: 'bytes32' }],
    outputs: [
      {
        name: 'score',
        type: 'tuple',
        components: [
          { name: 'ctHash',       type: 'uint256' },
          { name: 'securityZone', type: 'uint8' },
          { name: 'utype',        type: 'uint8' },
          { name: 'signature',    type: 'bytes' },
        ],
      },
      { name: 'timestamp', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'setScore',
    inputs: [
      { name: 'debtorId', type: 'bytes32' },
      { name: 'ctHash',   type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'setDefaultScore',
    inputs: [{ name: 'ctHash', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// ─── Reineira core contract ABIs (used by flow hooks) ────────────────────────

export const ConfidentialEscrowABI = [
  {
    name: 'create',
    inputs: [
      {
        name: 'encryptedOwner',
        type: 'tuple',
        components: [
          { name: 'ctHash',       type: 'uint256' },
          { name: 'securityZone', type: 'uint8' },
          { name: 'utype',        type: 'uint8' },
          { name: 'signature',    type: 'bytes' },
        ],
      },
      {
        name: 'encryptedAmount',
        type: 'tuple',
        components: [
          { name: 'ctHash',       type: 'uint256' },
          { name: 'securityZone', type: 'uint8' },
          { name: 'utype',        type: 'uint8' },
          { name: 'signature',    type: 'bytes' },
        ],
      },
      { name: 'resolver',     type: 'address' },
      { name: 'resolverData', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'redeemMultiple',
    inputs: [{ name: 'escrowIds', type: 'uint256[]' }],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export const InsurancePoolABI = [
  {
    name: 'stake',
    inputs: [
      {
        name: 'encryptedAmount',
        type: 'tuple',
        components: [
          { name: 'ctHash',       type: 'uint256' },
          { name: 'securityZone', type: 'uint8' },
          { name: 'utype',        type: 'uint8' },
          { name: 'signature',    type: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: 'stakeId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'unstake',
    inputs: [{ name: 'stakeId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'Staked',
    type: 'event',
    anonymous: false,
    inputs: [{ indexed: true, name: 'stakeId', type: 'uint256' }],
  },
  {
    name: 'Unstaked',
    type: 'event',
    anonymous: false,
    inputs: [{ indexed: true, name: 'stakeId', type: 'uint256' }],
  },
] as const;

// ─── ConfidentialCoverageManager ABI (Reineira core) ─────────────────────────
// Source: ReineiraOS protocol docs — insurance.md

const InEuintComponents = [
  { name: 'ctHash',       type: 'uint256' },
  { name: 'securityZone', type: 'uint8' },
  { name: 'utype',        type: 'uint8' },
  { name: 'signature',    type: 'bytes' },
] as const;

export const ConfidentialCoverageManagerABI = [
  {
    name: 'purchaseCoverage',
    inputs: [
      { name: 'encryptedHolder',         type: 'tuple', components: InEuintComponents },
      { name: 'pool',                    type: 'address' },
      { name: 'policy',                  type: 'address' },
      { name: 'escrowId',                type: 'uint256' },
      { name: 'encryptedCoverageAmount', type: 'tuple', components: InEuintComponents },
      { name: 'coverageExpiry',          type: 'uint256' },
      { name: 'policyData',              type: 'bytes' },
      { name: 'riskProof',               type: 'bytes' },
    ],
    outputs: [{ name: 'coverageId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'dispute',
    inputs: [
      { name: 'coverageId',   type: 'uint256' },
      { name: 'disputeProof', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'coverageStatus',
    inputs: [{ name: 'coverageId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'CoveragePurchased',
    anonymous: false,
    inputs: [{ indexed: true, name: 'coverageId', type: 'uint256' }],
    type: 'event',
  },
  {
    name: 'DisputeFiled',
    anonymous: false,
    inputs: [{ indexed: true, name: 'coverageId', type: 'uint256' }],
    type: 'event',
  },
  {
    name: 'CoverageClaimed',
    anonymous: false,
    inputs: [{ indexed: true, name: 'coverageId', type: 'uint256' }],
    type: 'event',
  },
] as const;

export const cUSDCABI = [
  {
    name: 'wrap',
    inputs: [
      { name: 'to',     type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'unwrap',
    inputs: [
      { name: 'to',    type: 'address' },
      { name: 'value', type: 'uint64' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'setOperator',
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'until',    type: 'uint48' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'isOperator',
    inputs: [
      { name: 'holder',  type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const ERC20ApproveABI = [
  {
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount',  type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// ─── Contract config bundles ─────────────────────────────────────────────────
// Import one of these in any hook/service — address + ABI always travel together.

export const CONTRACTS = {
  TradeInvoiceResolver: {
    address: ADDRESSES.TradeInvoiceResolver,
    abi: TradeInvoiceResolverABI,
  },
  TradeCreditInsurancePolicy: {
    address: ADDRESSES.TradeCreditInsurancePolicy,
    abi: TradeCreditInsurancePolicyABI,
  },
  DebtorExposureRegistry: {
    address: ADDRESSES.DebtorExposureRegistry,
    abi: DebtorExposureRegistryABI,
  },
  InsuranceClaimsRegistry: {
    address: ADDRESSES.InsuranceClaimsRegistry,
    abi: InsuranceClaimsRegistryABI,
  },
  MockDebtorProof: {
    address: ADDRESSES.MockDebtorProof,
    abi: MockDebtorProofABI,
  },
  ConfidentialEscrow: {
    address: ADDRESSES.ConfidentialEscrow,
    abi: ConfidentialEscrowABI,
  },
  ConfidentialCoverageManager: {
    address: ADDRESSES.ConfidentialCoverageManager,
    abi: ConfidentialCoverageManagerABI,
  },
  cUSDC: {
    address: ADDRESSES.cUSDC,
    abi: cUSDCABI,
  },
} as const;
