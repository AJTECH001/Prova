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
  MemoryApiCredentialRepository,
  MemoryBusinessProfileRepository,
  MemoryEscrowEventRepository,
  MemoryEscrowRepository,
  MemoryNonceRepository,
  MemorySessionRepository,
  MemoryUserRepository,
  MemoryWithdrawalRepository
};
//# sourceMappingURL=index.js.map