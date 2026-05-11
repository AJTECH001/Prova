// src/application/use-case/balance/get-balance.use-case.ts
import { createPublicClient, http, formatUnits } from "viem";
import { arbitrumSepolia } from "viem/chains";

// src/core/config.ts
import { z } from "zod";
var EnvSchema = z.object({
  DB_PROVIDER: z.enum(["memory", "postgres"]).default("postgres"),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ISSUER: z.string().default("reineira.xyz"),
  ACCESS_TOKEN_TTL: z.coerce.number().default(3600),
  REFRESH_TOKEN_TTL: z.coerce.number().default(2592e3),
  CHAIN_ID: z.coerce.number().default(421614),
  RPC_URL: z.string().optional(),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000,http://localhost:4831"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  PORT: z.coerce.number().default(3e3),
  QUICKNODE_WEBHOOK_SECRET: z.string().optional(),
  RELAY_WEBHOOK_SECRET: z.string().optional(),
  PRIVATE_KEY: z.string().optional(),
  ESCROW_CONTRACT_ADDRESS: z.string().optional(),
  PUSDC_WRAPPER_ADDRESS: z.string().optional(),
  RESOLVER_ADDRESS: z.string().optional(),
  POLICY_ADDRESS: z.string().optional(),
  EXPOSURE_REGISTRY_ADDRESS: z.string().optional(),
  CLAIMS_REGISTRY_ADDRESS: z.string().optional(),
  MOCK_DEBTOR_PROOF_ADDRESS: z.string().optional(),
  COVERAGE_MANAGER_ADDRESS: z.string().optional(),
  POOL_ADDRESS: z.string().optional(),
  POOL_FACTORY_ADDRESS: z.string().optional(),
  USDC_ADDRESS: z.string().optional(),
  FHE_WORKER_URL: z.string().default("http://localhost:3001"),
  ADMIN_PRIVATE_KEY: z.string().optional(),
  DEFAULT_CONCENTRATION_CAP_USDC: z.coerce.number().default(1e6)
});
var _env = null;
function getEnv() {
  if (!_env) {
    _env = EnvSchema.parse(process.env);
  }
  return _env;
}

// src/application/use-case/balance/get-balance.use-case.ts
var ERC20_BALANCE_OF_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  }
];
var USDC_DECIMALS = 6;
var GetBalanceUseCase = class {
  async execute(walletAddress) {
    const env = getEnv();
    const usdcAddress = env.USDC_ADDRESS ?? "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";
    try {
      const client = createPublicClient({
        chain: arbitrumSepolia,
        transport: http(env.RPC_URL || void 0)
      });
      const raw = await client.readContract({
        address: usdcAddress,
        abi: ERC20_BALANCE_OF_ABI,
        functionName: "balanceOf",
        args: [walletAddress]
      });
      const formatted = formatUnits(raw, USDC_DECIMALS);
      return {
        wallet_address: walletAddress,
        balance: raw.toString(),
        formatted_balance: parseFloat(formatted).toFixed(2),
        currency: "USDC",
        chain_id: env.CHAIN_ID
      };
    } catch {
      return {
        wallet_address: walletAddress,
        balance: "0",
        formatted_balance: "0.00",
        currency: "USDC",
        chain_id: env.CHAIN_ID
      };
    }
  }
};
export {
  GetBalanceUseCase
};
//# sourceMappingURL=get-balance.use-case.js.map