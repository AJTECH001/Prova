// src/infrastructure/repository/memory/memory-user.repository.ts
var MemoryUserRepository = class {
  store = /* @__PURE__ */ new Map();
  async findById(id) {
    return this.store.get(id) ?? null;
  }
  async findByWalletAddress(address) {
    for (const user of this.store.values()) {
      if (user.walletAddress === address) return user;
    }
    return null;
  }
  async save(user) {
    this.store.set(user.id, user);
  }
};
export {
  MemoryUserRepository
};
//# sourceMappingURL=memory-user.repository.js.map