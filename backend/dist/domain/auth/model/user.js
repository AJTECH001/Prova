// src/domain/auth/model/user.ts
var User = class _User {
  id;
  walletAddress;
  walletProvider;
  email;
  role;
  createdAt;
  constructor(params) {
    this.id = params.id;
    this.walletAddress = params.walletAddress;
    this.walletProvider = params.walletProvider;
    this.email = params.email;
    this.role = params.role;
    this.createdAt = params.createdAt;
  }
  withRole(role) {
    return new _User({ ...this, role });
  }
};
export {
  User
};
//# sourceMappingURL=user.js.map