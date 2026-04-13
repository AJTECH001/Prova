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
export {
  ApiCredential
};
//# sourceMappingURL=api-credential.js.map