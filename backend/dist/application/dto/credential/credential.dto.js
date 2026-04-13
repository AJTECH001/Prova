// src/application/dto/credential/credential.dto.ts
import { z } from "zod";
var GenerateCredentialsResponseSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
  status: z.string(),
  created_at: z.string()
});
var CredentialResponseSchema = z.object({
  client_id: z.string(),
  status: z.string(),
  created_at: z.string(),
  last_used_at: z.string().optional()
});
var GetCredentialsResponseSchema = z.object({
  credentials: z.array(CredentialResponseSchema)
});
var OAuthTokenRequestSchema = z.object({
  grant_type: z.literal("client_credentials"),
  client_id: z.string().min(1),
  client_secret: z.string().min(1)
});
var OAuthTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal("Bearer"),
  expires_in: z.number()
});
export {
  CredentialResponseSchema,
  GenerateCredentialsResponseSchema,
  GetCredentialsResponseSchema,
  OAuthTokenRequestSchema,
  OAuthTokenResponseSchema
};
//# sourceMappingURL=credential.dto.js.map