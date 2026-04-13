// src/application/use-case/credential/generate-credentials.use-case.ts
import { randomUUID, randomBytes, scrypt } from "crypto";
import { promisify } from "util";

// src/domain/api-credential/model/api-credential.ts
var ApiCredential = class {
  id;
  clientId;
  userId;
  hashedSecret;
  salt;
  status;
  createdAt;
  lastUsedAt;
  constructor(params) {
    this.id = params.id;
    this.clientId = params.clientId;
    this.userId = params.userId;
    this.hashedSecret = params.hashedSecret;
    this.salt = params.salt;
    this.status = params.status;
    this.createdAt = params.createdAt;
    this.lastUsedAt = params.lastUsedAt;
  }
  revoke() {
    this.status = "revoked";
    return this;
  }
  touch() {
    this.lastUsedAt = /* @__PURE__ */ new Date();
    return this;
  }
  isActive() {
    return this.status === "active";
  }
};

// src/application/use-case/credential/generate-credentials.use-case.ts
var scryptAsync = promisify(scrypt);
var GenerateCredentialsUseCase = class {
  constructor(credentialRepository) {
    this.credentialRepository = credentialRepository;
  }
  credentialRepository;
  async execute(userId) {
    const clientId = `rc_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
    const clientSecret = randomBytes(64).toString("hex");
    const salt = randomBytes(32).toString("hex");
    const hashedSecret = (await scryptAsync(clientSecret, salt, 64)).toString("hex");
    const credential = new ApiCredential({
      id: randomUUID(),
      clientId,
      userId,
      hashedSecret,
      salt,
      status: "active",
      createdAt: /* @__PURE__ */ new Date()
    });
    await this.credentialRepository.save(credential);
    return {
      client_id: clientId,
      client_secret: clientSecret,
      status: credential.status,
      created_at: credential.createdAt.toISOString()
    };
  }
};
export {
  GenerateCredentialsUseCase
};
//# sourceMappingURL=generate-credentials.use-case.js.map