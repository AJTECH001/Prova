// src/domain/auth/model/user.ts
var User = class {
  id;
  walletAddress;
  walletProvider;
  email;
  createdAt;
  constructor(params) {
    this.id = params.id;
    this.walletAddress = params.walletAddress;
    this.walletProvider = params.walletProvider;
    this.email = params.email;
    this.createdAt = params.createdAt;
  }
};
export {
  User
};
//# sourceMappingURL=user.js.map