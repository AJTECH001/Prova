// src/application/use-case/webhook/relay-callback.use-case.ts
var RelayCallbackUseCase = class {
  constructor(withdrawalRepository) {
    this.withdrawalRepository = withdrawalRepository;
  }
  withdrawalRepository;
  async execute(payload) {
    const data = payload;
    if (!data.withdrawal_id) {
      return;
    }
    const withdrawal = await this.withdrawalRepository.findByPublicId(data.withdrawal_id);
    if (!withdrawal) {
      return;
    }
    if (data.status === "completed" && data.tx_hash) {
      withdrawal.markCompleted(data.tx_hash);
    } else if (data.status === "failed") {
      withdrawal.markFailed(data.error ?? "Relay callback reported failure");
    }
    await this.withdrawalRepository.update(withdrawal);
  }
};
export {
  RelayCallbackUseCase
};
//# sourceMappingURL=relay-callback.use-case.js.map