// src/infrastructure/repository/memory/memory-nonce.repository.ts
var MemoryNonceRepository = class {
  store = /* @__PURE__ */ new Map();
  async save(walletAddress, nonce, ttlSeconds) {
    const key = `${walletAddress}:${nonce}`;
    this.store.set(key, { nonce, expiresAt: Date.now() + ttlSeconds * 1e3 });
  }
  async findAndDelete(walletAddress, nonce) {
    const key = `${walletAddress}:${nonce}`;
    const entry = this.store.get(key);
    if (!entry || entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return false;
    }
    this.store.delete(key);
    return true;
  }
};
export {
  MemoryNonceRepository
};
//# sourceMappingURL=memory-nonce.repository.js.map