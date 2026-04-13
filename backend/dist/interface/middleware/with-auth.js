// src/interface/middleware/with-auth.ts
import { jwtVerify } from "jose";

// src/core/config.ts
import { z } from "zod";
var EnvSchema = z.object({
  DB_PROVIDER: z.enum(["memory", "postgres"]).default("memory"),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(1),
  JWT_ISSUER: z.string().default("reineira.xyz"),
  ACCESS_TOKEN_TTL: z.coerce.number().default(3600),
  REFRESH_TOKEN_TTL: z.coerce.number().default(2592e3),
  CHAIN_ID: z.coerce.number().default(421614),
  RPC_URL: z.string().optional(),
  ALLOWED_ORIGINS: z.string().default("http://localhost:5173"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  PORT: z.coerce.number().default(3e3),
  QUICKNODE_WEBHOOK_SECRET: z.string().optional(),
  RELAY_WEBHOOK_SECRET: z.string().optional(),
  ESCROW_CONTRACT_ADDRESS: z.string().optional(),
  PUSDC_WRAPPER_ADDRESS: z.string().optional(),
  FHE_WORKER_URL: z.string().default("http://localhost:3001")
});
var _env = null;
function getEnv() {
  if (!_env) {
    _env = EnvSchema.parse(process.env);
  }
  return _env;
}

// src/interface/dto/error-response.dto.ts
import { z as z2 } from "zod";
var InvalidParamSchema = z2.object({
  name: z2.string(),
  reason: z2.string()
});
var ErrorResponseDtoSchema = z2.object({
  type: z2.string(),
  title: z2.string(),
  status: z2.number(),
  detail: z2.string().optional()
});
var ValidationErrorResponseDtoSchema = ErrorResponseDtoSchema.extend({
  invalid_params: z2.array(InvalidParamSchema)
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

// src/interface/response.ts
function getSafeOrigin() {
  try {
    return getEnv().ALLOWED_ORIGINS;
  } catch {
    return "*";
  }
}
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": getSafeOrigin(),
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400"
  };
}
function defaultHeaders() {
  return {
    "Content-Type": "application/json",
    ...corsHeaders()
  };
}
var Response = {
  ok(data) {
    return {
      statusCode: 200,
      headers: defaultHeaders(),
      body: JSON.stringify(data)
    };
  },
  created(data) {
    return {
      statusCode: 201,
      headers: defaultHeaders(),
      body: JSON.stringify(data)
    };
  },
  noContent() {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: ""
    };
  },
  badRequest(title, detail) {
    return {
      statusCode: 400,
      headers: defaultHeaders(),
      body: JSON.stringify(ErrorResponseDtoFactory.create(400, title, detail))
    };
  },
  unauthorized(title, detail) {
    return {
      statusCode: 401,
      headers: defaultHeaders(),
      body: JSON.stringify(ErrorResponseDtoFactory.create(401, title, detail))
    };
  },
  notFound(title, detail) {
    return {
      statusCode: 404,
      headers: defaultHeaders(),
      body: JSON.stringify(ErrorResponseDtoFactory.create(404, title, detail))
    };
  },
  conflict(title, detail) {
    return {
      statusCode: 409,
      headers: defaultHeaders(),
      body: JSON.stringify(ErrorResponseDtoFactory.create(409, title, detail))
    };
  },
  unprocessableEntity(title, invalidParams, detail) {
    const body = invalidParams ? ErrorResponseDtoFactory.createValidation(title, invalidParams, detail) : ErrorResponseDtoFactory.create(422, title, detail);
    return {
      statusCode: 422,
      headers: defaultHeaders(),
      body: JSON.stringify(body)
    };
  },
  fromZodError(error) {
    return {
      statusCode: 422,
      headers: defaultHeaders(),
      body: JSON.stringify(ErrorResponseDtoFactory.fromZodError(error))
    };
  },
  fromError(error, statusCode = 500) {
    return {
      statusCode,
      headers: defaultHeaders(),
      body: JSON.stringify(ErrorResponseDtoFactory.fromError(error, statusCode))
    };
  },
  internalServerError(title = "Internal server error", detail) {
    return {
      statusCode: 500,
      headers: defaultHeaders(),
      body: JSON.stringify(ErrorResponseDtoFactory.create(500, title, detail))
    };
  }
};

// src/interface/handler-factory.ts
import { ZodError } from "zod";

// src/core/logger.ts
import pino from "pino";

// src/interface/handler-factory.ts
function sendResponse(res, response) {
  const { statusCode, headers, body } = response;
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }
  if (statusCode === 204) {
    res.status(204).end();
    return;
  }
  res.status(statusCode).end(body);
}

// src/interface/middleware/with-auth.ts
function extractBearerToken(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }
  return header.slice(7);
}
function withAuth(handler) {
  return async (req, res) => {
    const token = extractBearerToken(req);
    if (!token) {
      sendResponse(res, Response.unauthorized("Missing authorization", "Bearer token is required"));
      return;
    }
    try {
      const { JWT_SECRET, JWT_ISSUER } = getEnv();
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jwtVerify(token, secret, {
        issuer: JWT_ISSUER
      });
      req.authPayload = payload;
    } catch {
      sendResponse(res, Response.unauthorized("Invalid token", "Token verification failed"));
      return;
    }
    return handler(req, res);
  };
}
export {
  withAuth
};
//# sourceMappingURL=with-auth.js.map