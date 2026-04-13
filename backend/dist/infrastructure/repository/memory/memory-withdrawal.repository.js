// src/infrastructure/repository/memory/memory-withdrawal.repository.ts
var MemoryWithdrawalRepository = class {
  store = /* @__PURE__ */ new Map();
  async findById(id) {
    return this.store.get(id) ?? null;
  }
  async findByPublicId(publicId) {
    for (const withdrawal of this.store.values()) {
      if (withdrawal.publicId === publicId) return withdrawal;
    }
    return null;
  }
  async findByUserId(userId, options) {
    let items = [...this.store.values()].filter((w) => w.userId === userId).filter((w) => options?.status ? w.status === options.status : true).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    if (options?.cursor) {
      const cursorIndex = items.findIndex((w) => w.publicId === options.cursor);
      if (cursorIndex !== -1) {
        items = items.slice(cursorIndex + 1);
      }
    }
    const limit = options?.limit ?? 20;
    const page = items.slice(0, limit);
    const nextCursor = page.length === limit ? page[page.length - 1].publicId : void 0;
    return { items: page, cursor: nextCursor };
  }
  async save(withdrawal) {
    this.store.set(withdrawal.id, withdrawal);
  }
  async update(withdrawal) {
    this.store.set(withdrawal.id, withdrawal);
  }
};
export {
  MemoryWithdrawalRepository
};
//# sourceMappingURL=memory-withdrawal.repository.js.map