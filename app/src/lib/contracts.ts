// ─── Deployed contract addresses ────────────────────────────────────────────
// Source: contracts/deployments/arb-sepolia.json  (chainId 421614)

export const CHAIN_ID = 421614; // Arbitrum Sepolia

export const ADDRESSES = {
  // PROVA contracts
  ProvaPaymentResolver:    '0x377C482B164567d7bC11f0D63BD69E4AD950fb91',
  ProvaUnderwriterPolicy:  '0x8CdF4c1815d8E5fE28Ad6592387B41339283f0f0',
  DebtorExposureRegistry:  '0xF2AB3Cfc132dc1873019c526673f85ad700FDca6',
  ProvaLossHistory:        '0x3fA333E705B1dB0AA71C5c24471F8212D54121aD',
  MockDebtorProof:         '0x4Ea4e0Cc35DA820eF37B38Dba5515C887CdC7EF9',
  // Reineira core contracts
  ConfidentialEscrow:          '0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa',
  ConfidentialCoverageManager: '0x766e9508BD41BCE0e788F16Da86B3615386Ff6f6',
  PoolFactory:                 '0x03bAc36d45fA6f5aD8661b95D73452b3BedcaBFD',
  PolicyRegistry:              '0xf421363B642315BD3555dE2d9BD566b7f9213c8E',
  cUSDC:                       '0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f',
  USDC:                        '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
} as const;

// ─── ABIs ────────────────────────────────────────────────────────────────────
// Sourced from: contracts/artifacts/contracts/.../<Contract>.sol/<Contract>.json

export const ProvaPaymentResolverABI = [
  { name: 'ConditionAlreadySet', inputs: [{ name: 'escrowId', type: 'uint256' }], type: 'error' },
  { name: 'ConditionNotSet',     inputs: [{ name: 'escrowId', type: 'uint256' }], type: 'error' },
  { name: 'InvalidAmount',       inputs: [], type: 'error' },
  { name: 'InvalidBuyer',        inputs: [], type: 'error' },
  { name: 'InvalidDueDate',      inputs: [], type: 'error' },
  { name: 'InvalidSeller',       inputs: [], type: 'error' },
  { name: 'InvalidWaitingPeriod',inputs: [], type: 'error' },
  { name: 'NotAProvaContract',   inputs: [], type: 'error' },
  { name: 'UnauthorizedCaller',  inputs: [{ name: 'escrowId', type: 'uint256' }], type: 'error' },
  {
    name: 'ConditionSet',
    anonymous: false,
    inputs: [{ indexed: true, name: 'escrowId', type: 'uint256' }],
    type: 'event',
  },
  {
    name: 'DEFAULT_WAITING_PERIOD',
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
  {
    name: 'MIN_WAITING_PERIOD',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
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
      { name: 'data', type: 'bytes' },
    ],
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
    name: 'initialize',
    inputs: [{ name: 'initialOwner', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
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
      { name: 'data', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

export const ProvaUnderwriterPolicyABI = [
  { name: 'InvalidAddonBps',           inputs: [], type: 'error' },
  { name: 'InvalidCoveragePercentage', inputs: [], type: 'error' },
  { name: 'InvalidCreditLimit',        inputs: [], type: 'error' },
  { name: 'InvalidCurve',              inputs: [], type: 'error' },
  { name: 'NotAProvaContract',         inputs: [], type: 'error' },
  { name: 'ZeroAddress',               inputs: [], type: 'error' },
  { name: 'PolicyAlreadySet', inputs: [{ name: 'coverageId', type: 'uint256' }], type: 'error' },
  { name: 'PolicyNotSet',     inputs: [{ name: 'coverageId', type: 'uint256' }], type: 'error' },
  { name: 'UnauthorizedCaller', inputs: [{ name: 'coverageId', type: 'uint256' }], type: 'error' },
  {
    name: 'PolicySet',
    anonymous: false,
    inputs: [{ indexed: true, name: 'coverageId', type: 'uint256' }],
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
    name: 'CurveUpdated',
    anonymous: false,
    inputs: [{ indexed: false, name: 'newVersion', type: 'uint8' }],
    type: 'event',
  },
  {
    name: 'initialize',
    inputs: [
      { name: 'initialOwner',       type: 'address' },
      { name: '_debtorProofAdapter', type: 'address' },
      { name: '_exposureRegistry',   type: 'address' },
      { name: '_lossHistory',        type: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
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
  {
    name: 'curveVersion',
    inputs: [],
    outputs: [{ type: 'uint8' }],
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
  { name: 'NotAProvaContract',    inputs: [], type: 'error' },
  { name: 'NotRegisteredContract',inputs: [], type: 'error' },
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
  {
    name: 'initialize',
    inputs: [{ name: 'initialOwner', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'addExposure',
    inputs: [
      { name: 'debtorId',      type: 'bytes32' },
      { name: 'poolId',        type: 'address' },
      { name: 'amount',        type: 'bytes32' },  // euint64
      { name: 'globalCapPlain', type: 'uint64' },
    ],
    outputs: [{ name: 'ok', type: 'bytes32' }],    // ebool
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

export const ProvaLossHistoryABI = [
  { name: 'NotAProvaContract', inputs: [], type: 'error' },
  {
    name: 'PolicyRegistered',
    anonymous: false,
    inputs: [{ indexed: true, name: 'policy', type: 'address' }],
    type: 'event',
  },
  {
    name: 'initialize',
    inputs: [{ name: 'initialOwner', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
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

export const cUSDCABI = [
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
] as const;

// ─── Contract config bundles ─────────────────────────────────────────────────
// Import one of these in any hook/service — address + ABI always travel together.

export const CONTRACTS = {
  ProvaPaymentResolver: {
    address: ADDRESSES.ProvaPaymentResolver,
    abi: ProvaPaymentResolverABI,
  },
  ProvaUnderwriterPolicy: {
    address: ADDRESSES.ProvaUnderwriterPolicy,
    abi: ProvaUnderwriterPolicyABI,
  },
  DebtorExposureRegistry: {
    address: ADDRESSES.DebtorExposureRegistry,
    abi: DebtorExposureRegistryABI,
  },
  ProvaLossHistory: {
    address: ADDRESSES.ProvaLossHistory,
    abi: ProvaLossHistoryABI,
  },
  MockDebtorProof: {
    address: ADDRESSES.MockDebtorProof,
    abi: MockDebtorProofABI,
  },
  ConfidentialEscrow: {
    address: ADDRESSES.ConfidentialEscrow,
    abi: ConfidentialEscrowABI,
  },
  cUSDC: {
    address: ADDRESSES.cUSDC,
    abi: cUSDCABI,
  },
} as const;
