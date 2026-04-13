// src/interface/handler-factory.ts
import { ZodError } from "zod";

// src/core/errors.ts
var ApplicationHttpError = class _ApplicationHttpError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = "ApplicationHttpError";
  }
  statusCode;
  details;
  static badRequest(message) {
    return new _ApplicationHttpError(400, message);
  }
  static unauthorized(message) {
    return new _ApplicationHttpError(401, message);
  }
  static forbidden(message) {
    return new _ApplicationHttpError(403, message);
  }
  static notFound(message) {
    return new _ApplicationHttpError(404, message);
  }
  static conflict(message) {
    return new _ApplicationHttpError(409, message);
  }
  static validationError(details) {
    return new _ApplicationHttpError(422, "Validation failed", details);
  }
  static internalError(message = "Internal server error") {
    return new _ApplicationHttpError(500, message);
  }
};

// src/core/logger.ts
import pino from "pino";

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

// src/core/logger.ts
var _logger = null;
function getLogger(name) {
  if (!_logger) {
    _logger = pino({
      level: getEnv().LOG_LEVEL,
      formatters: {
        level: (label) => ({ level: label })
      }
    });
  }
  return name ? _logger.child({ name }) : _logger;
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
function isHttpResponse(value) {
  return typeof value === "object" && value !== null && "statusCode" in value && "body" in value && typeof value.statusCode === "number" && typeof value.body === "string";
}
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
function handleError(error, operationName) {
  const logger = getLogger(operationName);
  if (error instanceof ZodError) {
    return Response.fromZodError(error);
  }
  if (error instanceof ApplicationHttpError) {
    return Response.fromError(error, error.statusCode);
  }
  logger.error({ err: error }, "Unhandled error");
  return Response.internalServerError();
}
function createHandler(config) {
  const { operationName, schema, execute } = config;
  return async (req, res) => {
    try {
      let rawBody;
      try {
        rawBody = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      } catch {
        sendResponse(res, Response.badRequest("Invalid JSON", "Request body is not valid JSON"));
        return;
      }
      const dto = schema.parse(rawBody);
      const authReq = req;
      const result = await execute(dto, authReq, authReq.authPayload);
      if (isHttpResponse(result)) {
        sendResponse(res, result);
        return;
      }
      sendResponse(res, Response.ok(result));
    } catch (error) {
      sendResponse(res, handleError(error, operationName));
    }
  };
}
function createGetHandler(config) {
  const { operationName, execute } = config;
  return async (req, res) => {
    try {
      const authReq = req;
      const result = await execute(authReq, authReq.authPayload);
      if (isHttpResponse(result)) {
        sendResponse(res, result);
        return;
      }
      sendResponse(res, Response.ok(result));
    } catch (error) {
      sendResponse(res, handleError(error, operationName));
    }
  };
}
export {
  createGetHandler,
  createHandler,
  sendResponse
};
//# sourceMappingURL=handler-factory.js.map