// src/application/use-case/auth/request-nonce.use-case.ts
var RequestNonceUseCase = class {
  constructor(nonceService) {
    this.nonceService = nonceService;
  }
  nonceService;
  async execute(dto) {
    const nonce = await this.nonceService.generateNonce(dto.wallet_address);
    return { nonce };
  }
};
export {
  RequestNonceUseCase
};
//# sourceMappingURL=request-nonce.use-case.js.map