// src/infrastructure/repository/memory/memory-business-profile.repository.ts
var MemoryBusinessProfileRepository = class {
  store = /* @__PURE__ */ new Map();
  async findByUserId(userId) {
    for (const profile of this.store.values()) {
      if (profile.userId === userId) return profile;
    }
    return null;
  }
  async save(profile) {
    this.store.set(profile.id, profile);
  }
};
export {
  MemoryBusinessProfileRepository
};
//# sourceMappingURL=memory-business-profile.repository.js.map