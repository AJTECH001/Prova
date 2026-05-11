import type { VercelRequest, VercelResponse } from '@vercel/node';

import authNonceHandler from '../src/handlers/auth/wallet/nonce.js';
import authVerifyHandler from '../src/handlers/auth/wallet/verify.js';
import authRefreshHandler from '../src/handlers/auth/tokens/refresh.js';
import authTokensHandler from '../src/handlers/auth/tokens/index.js';
import apiCredentialOauthHandler from '../src/handlers/api-credentials/oauth/token.js';
import apiCredentialByIdHandler from '../src/handlers/api-credentials/[clientId].js';
import apiCredentialsHandler from '../src/handlers/api-credentials/index.js';
import balanceHandler from '../src/handlers/balance/index.js';
import businessProfilesHandler from '../src/handlers/business-profiles/index.js';
import creditScoreHandler from '../src/handlers/credit-score/[buyerAddress].js';
import openApiHandler from '../src/handlers/docs/openapi.json.js';
import escrowPayableHandler from '../src/handlers/escrows/payable.js';
import escrowCoverageHandler from '../src/handlers/escrows/[publicId]/coverage.js';
import escrowByIdHandler from '../src/handlers/escrows/[publicId].js';
import escrowsHandler from '../src/handlers/escrows/index.js';
import poolConfirmStakeHandler from '../src/handlers/pool/confirm-stake/[publicId].js';
import poolConfirmUnstakeHandler from '../src/handlers/pool/confirm-unstake/[publicId].js';
import poolCreateHandler from '../src/handlers/pool/create.js';
import poolPolicyHandler from '../src/handlers/pool/policy/[address].js';
import poolStakeHandler from '../src/handlers/pool/stake.js';
import poolStatusHandler from '../src/handlers/pool/status.js';
import poolUnstakeHandler from '../src/handlers/pool/unstake/[stakeId].js';
import poolHandler from '../src/handlers/pool/index.js';
import publicEscrowHandler from '../src/handlers/public/escrows/[publicId].js';
import transactionEscrowsFundedHandler from '../src/handlers/transactions/escrows/funded.js';
import transactionEscrowsReportHandler from '../src/handlers/transactions/escrows/report.js';
import transactionWithdrawalsReportHandler from '../src/handlers/transactions/withdrawals/report.js';
import publicTransactionHandler from '../src/handlers/transactions/public/[publicId].js';
import transactionByIdHandler from '../src/handlers/transactions/[publicId].js';
import transactionsHandler from '../src/handlers/transactions/index.js';
import usersMeRoleHandler from '../src/handlers/users/me/role.js';
import usersMeHandler from '../src/handlers/users/me.js';
import webhookCoverageHandler from '../src/handlers/webhooks/coverage.js';
import webhookQuicknodeHandler from '../src/handlers/webhooks/quicknode.js';
import webhookRelayHandler from '../src/handlers/webhooks/relay-callback.js';
import withdrawalBridgeChallengeHandler from '../src/handlers/withdrawals/[publicId]/bridge-challenge.js';
import withdrawalBridgeReadinessHandler from '../src/handlers/withdrawals/[publicId]/bridge-readiness.js';
import withdrawalByIdHandler from '../src/handlers/withdrawals/[publicId].js';
import withdrawalsHandler from '../src/handlers/withdrawals/index.js';

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

interface Route {
  pattern: RegExp;
  paramNames: string[];
  handler: Handler;
}

// Order matters: specific static routes before dynamic ones.
const ROUTES: Route[] = [
  // Auth
  { pattern: /^\/api\/v1\/auth\/wallet\/nonce$/,    paramNames: [],           handler: authNonceHandler },
  { pattern: /^\/api\/v1\/auth\/wallet\/verify$/,   paramNames: [],           handler: authVerifyHandler },
  { pattern: /^\/api\/v1\/auth\/tokens\/refresh$/,  paramNames: [],           handler: authRefreshHandler },
  { pattern: /^\/api\/v1\/auth\/tokens$/,           paramNames: [],           handler: authTokensHandler },
  // API Credentials
  { pattern: /^\/api\/v1\/api-credentials\/oauth\/token$/, paramNames: [],    handler: apiCredentialOauthHandler },
  { pattern: /^\/api\/v1\/api-credentials\/([^/]+)$/, paramNames: ['clientId'], handler: apiCredentialByIdHandler },
  { pattern: /^\/api\/v1\/api-credentials$/,        paramNames: [],           handler: apiCredentialsHandler },
  // Balance
  { pattern: /^\/api\/v1\/balance$/,                paramNames: [],           handler: balanceHandler },
  // Business Profiles
  { pattern: /^\/api\/v1\/business-profiles$/,      paramNames: [],           handler: businessProfilesHandler },
  // Credit Score
  { pattern: /^\/api\/v1\/credit-score\/([^/]+)$/,  paramNames: ['buyerAddress'], handler: creditScoreHandler },
  // Docs
  { pattern: /^\/api\/v1\/docs\/openapi\.json$/,    paramNames: [],           handler: openApiHandler },
  // Escrows — payable and coverage before the generic :publicId catch
  { pattern: /^\/api\/v1\/escrows\/payable$/,       paramNames: [],           handler: escrowPayableHandler },
  { pattern: /^\/api\/v1\/escrows\/([^/]+)\/coverage$/, paramNames: ['publicId'], handler: escrowCoverageHandler },
  { pattern: /^\/api\/v1\/escrows\/([^/]+)$/,       paramNames: ['publicId'], handler: escrowByIdHandler },
  { pattern: /^\/api\/v1\/escrows$/,                paramNames: [],           handler: escrowsHandler },
  // Pool — static paths before dynamic
  { pattern: /^\/api\/v1\/pool\/confirm-stake\/([^/]+)$/,   paramNames: ['publicId'], handler: poolConfirmStakeHandler },
  { pattern: /^\/api\/v1\/pool\/confirm-unstake\/([^/]+)$/, paramNames: ['publicId'], handler: poolConfirmUnstakeHandler },
  { pattern: /^\/api\/v1\/pool\/create$/,           paramNames: [],           handler: poolCreateHandler },
  { pattern: /^\/api\/v1\/pool\/policy\/([^/]+)$/,  paramNames: ['address'],  handler: poolPolicyHandler },
  { pattern: /^\/api\/v1\/pool\/stake$/,            paramNames: [],           handler: poolStakeHandler },
  { pattern: /^\/api\/v1\/pool\/status$/,           paramNames: [],           handler: poolStatusHandler },
  { pattern: /^\/api\/v1\/pool\/unstake\/([^/]+)$/, paramNames: ['stakeId'],  handler: poolUnstakeHandler },
  { pattern: /^\/api\/v1\/pool$/,                   paramNames: [],           handler: poolHandler },
  // Public escrows
  { pattern: /^\/api\/v1\/public\/escrows\/([^/]+)$/, paramNames: ['publicId'], handler: publicEscrowHandler },
  // Transactions — static sub-paths before dynamic :publicId
  { pattern: /^\/api\/v1\/transactions\/escrows\/funded$/,       paramNames: [], handler: transactionEscrowsFundedHandler },
  { pattern: /^\/api\/v1\/transactions\/escrows\/report$/,       paramNames: [], handler: transactionEscrowsReportHandler },
  { pattern: /^\/api\/v1\/transactions\/withdrawals\/report$/,   paramNames: [], handler: transactionWithdrawalsReportHandler },
  { pattern: /^\/api\/v1\/transactions\/public\/([^/]+)$/,  paramNames: ['publicId'], handler: publicTransactionHandler },
  { pattern: /^\/api\/v1\/transactions\/([^/]+)$/,          paramNames: ['publicId'], handler: transactionByIdHandler },
  { pattern: /^\/api\/v1\/transactions$/,           paramNames: [],           handler: transactionsHandler },
  // Users
  { pattern: /^\/api\/v1\/users\/me\/role$/,        paramNames: [],           handler: usersMeRoleHandler },
  { pattern: /^\/api\/v1\/users\/me$/,              paramNames: [],           handler: usersMeHandler },
  // Webhooks
  { pattern: /^\/api\/v1\/webhooks\/coverage$/,     paramNames: [],           handler: webhookCoverageHandler },
  { pattern: /^\/api\/v1\/webhooks\/quicknode$/,    paramNames: [],           handler: webhookQuicknodeHandler },
  { pattern: /^\/api\/v1\/webhooks\/relay-callback$/, paramNames: [],         handler: webhookRelayHandler },
  // Withdrawals — sub-paths before dynamic :publicId
  { pattern: /^\/api\/v1\/withdrawals\/([^/]+)\/bridge-challenge$/,  paramNames: ['publicId'], handler: withdrawalBridgeChallengeHandler },
  { pattern: /^\/api\/v1\/withdrawals\/([^/]+)\/bridge-readiness$/,  paramNames: ['publicId'], handler: withdrawalBridgeReadinessHandler },
  { pattern: /^\/api\/v1\/withdrawals\/([^/]+)$/,   paramNames: ['publicId'], handler: withdrawalByIdHandler },
  { pattern: /^\/api\/v1\/withdrawals$/,            paramNames: [],           handler: withdrawalsHandler },
];

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const pathname = (req.url ?? '/').split('?')[0];

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const route = ROUTES.find((r) => r.pattern.test(pathname));

  if (!route) {
    res.status(404).json({ error: 'Not found', path: pathname });
    return;
  }

  // Inject path params into req.query so handlers can read req.query.publicId etc.
  const matches = pathname.match(route.pattern)!.slice(1);
  route.paramNames.forEach((name, i) => {
    (req.query as Record<string, string>)[name] = decodeURIComponent(matches[i] ?? '');
  });

  await route.handler(req, res);
}
