// src/infrastructure/repository/memory/memory-session.repository.ts
var MemorySessionRepository = class {
  store = /* @__PURE__ */ new Map();
  async findById(id) {
    return this.store.get(id) ?? null;
  }
  async findByRefreshToken(token) {
    for (const session of this.store.values()) {
      if (session.refreshToken === token) return session;
    }
    return null;
  }
  async findByUserId(userId) {
    return [...this.store.values()].filter((s) => s.userId === userId);
  }
  async save(session) {
    this.store.set(session.id, session);
  }
  async delete(id) {
    this.store.delete(id);
  }
  async deleteByUserId(userId) {
    for (const [id, session] of this.store) {
      if (session.userId === userId) this.store.delete(id);
    }
  }
};
export {
  MemorySessionRepository
};
//# sourceMappingURL=memory-session.repository.js.map