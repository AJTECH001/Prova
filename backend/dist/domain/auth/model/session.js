// src/domain/auth/model/session.ts
var Session = class {
  id;
  userId;
  refreshToken;
  expiresAt;
  createdAt;
  userAgent;
  ipAddress;
  constructor(params) {
    this.id = params.id;
    this.userId = params.userId;
    this.refreshToken = params.refreshToken;
    this.expiresAt = params.expiresAt;
    this.createdAt = params.createdAt;
    this.userAgent = params.userAgent;
    this.ipAddress = params.ipAddress;
  }
  isExpired() {
    return this.expiresAt < /* @__PURE__ */ new Date();
  }
  getTtlSeconds() {
    return Math.max(0, Math.floor((this.expiresAt.getTime() - Date.now()) / 1e3));
  }
};
export {
  Session
};
//# sourceMappingURL=session.js.map