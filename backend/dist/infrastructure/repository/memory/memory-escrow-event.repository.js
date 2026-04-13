// src/infrastructure/repository/memory/memory-escrow-event.repository.ts
var MemoryEscrowEventRepository = class {
  store = /* @__PURE__ */ new Map();
  async findByTxHash(txHash) {
    return this.store.get(txHash) ?? null;
  }
  async findByEscrowId(escrowId) {
    for (const event of this.store.values()) {
      if (event.escrowId === escrowId) return event;
    }
    return null;
  }
  async save(event) {
    this.store.set(event.txHash, event);
  }
  async delete(txHash) {
    this.store.delete(txHash);
  }
};
export {
  MemoryEscrowEventRepository
};
//# sourceMappingURL=memory-escrow-event.repository.js.map