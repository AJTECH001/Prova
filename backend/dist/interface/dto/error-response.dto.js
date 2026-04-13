// src/interface/dto/error-response.dto.ts
import { z } from "zod";
var InvalidParamSchema = z.object({
  name: z.string(),
  reason: z.string()
});
var ErrorResponseDtoSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  detail: z.string().optional()
});
var ValidationErrorResponseDtoSchema = ErrorResponseDtoSchema.extend({
  invalid_params: z.array(InvalidParamSchema)
});
var ErrorResponseDtoFactory = class _ErrorResponseDtoFactory {
  static create(status, title, detail) {
    return {
      type: `https://httpstatuses.com/${status}`,
      title,
      status,
      ...detail && { detail }
    };
  }
  static createValidation(title, invalidParams, detail) {
    return {
      type: "https://httpstatuses.com/422",
      title,
      status: 422,
      invalid_params: invalidParams,
      ...detail && { detail }
    };
  }
  static fromError(error, statusCode = 500) {
    return _ErrorResponseDtoFactory.create(statusCode, error.message);
  }
  static fromZodError(error) {
    const invalidParams = error.issues.map((issue) => ({
      name: issue.path.join("."),
      reason: issue.message
    }));
    return _ErrorResponseDtoFactory.createValidation("Validation failed", invalidParams);
  }
};
export {
  ErrorResponseDtoFactory,
  ErrorResponseDtoSchema,
  ValidationErrorResponseDtoSchema
};
//# sourceMappingURL=error-response.dto.js.map