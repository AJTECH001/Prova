// src/infrastructure/auth/nonce.service.ts
import { randomBytes } from "crypto";
var NONCE_TTL_SECONDS = 300;
var NonceService = class {
  constructor(nonceRepository) {
    this.nonceRepository = nonceRepository;
  }
  nonceRepository;
  async generateNonce(walletAddress) {
    const nonce = randomBytes(32).toString("hex");
    await this.nonceRepository.save(walletAddress, nonce, NONCE_TTL_SECONDS);
    return nonce;
  }
  async verifyNonce(walletAddress, nonce) {
    return this.nonceRepository.findAndDelete(walletAddress, nonce);
  }
};
export {
  NonceService
};
//# sourceMappingURL=nonce.service.js.map