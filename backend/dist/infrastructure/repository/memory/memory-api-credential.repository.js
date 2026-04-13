// src/infrastructure/repository/memory/memory-api-credential.repository.ts
var MemoryApiCredentialRepository = class {
  store = /* @__PURE__ */ new Map();
  async findByClientId(clientId) {
    for (const credential of this.store.values()) {
      if (credential.clientId === clientId) return credential;
    }
    return null;
  }
  async findByUserId(userId) {
    return [...this.store.values()].filter((c) => c.userId === userId);
  }
  async save(credential) {
    this.store.set(credential.id, credential);
  }
  async update(credential) {
    this.store.set(credential.id, credential);
  }
};
export {
  MemoryApiCredentialRepository
};
//# sourceMappingURL=memory-api-credential.repository.js.map