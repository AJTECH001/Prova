// src/infrastructure/repository/memory/memory-escrow.repository.ts
var MemoryEscrowRepository = class {
  store = /* @__PURE__ */ new Map();
  async findById(id) {
    return this.store.get(id) ?? null;
  }
  async findByPublicId(publicId) {
    for (const escrow of this.store.values()) {
      if (escrow.publicId === publicId) return escrow;
    }
    return null;
  }
  async findByUserId(userId, options) {
    let items = [...this.store.values()].filter((i) => i.userId === userId).filter((i) => options?.status ? i.status === options.status : true).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    if (options?.cursor) {
      const cursorIndex = items.findIndex((i) => i.publicId === options.cursor);
      if (cursorIndex !== -1) {
        items = items.slice(cursorIndex + 1);
      }
    }
    const limit = options?.limit ?? 20;
    const page = items.slice(0, limit);
    const nextCursor = page.length === limit ? page[page.length - 1].publicId : void 0;
    return { items: page, cursor: nextCursor };
  }
  async findByTxHash(txHash) {
    for (const escrow of this.store.values()) {
      if (escrow.txHash === txHash) return escrow;
    }
    return null;
  }
  async findByOnChainId(onChainId) {
    for (const escrow of this.store.values()) {
      if (escrow.onChainEscrowId === onChainId) return escrow;
    }
    return null;
  }
  async save(escrow) {
    this.store.set(escrow.id, escrow);
  }
  async update(escrow) {
    this.store.set(escrow.id, escrow);
  }
};
export {
  MemoryEscrowRepository
};
//# sourceMappingURL=memory-escrow.repository.js.map