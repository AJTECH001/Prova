// src/application/dto/auth/refresh-token.dto.ts
import { z } from "zod";
var RefreshTokenDtoSchema = z.object({
  refresh_token: z.string().min(1)
});
export {
  RefreshTokenDtoSchema
};
//# sourceMappingURL=refresh-token.dto.js.map