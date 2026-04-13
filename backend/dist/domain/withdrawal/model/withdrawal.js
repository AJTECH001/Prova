// src/domain/withdrawal/model/withdrawal.ts
var Withdrawal = class {
  id;
  publicId;
  userId;
  walletId;
  escrowIds;
  destinationChain;
  destinationDomain;
  recipientAddress;
  status;
  estimatedAmount;
  walletProvider;
  actualAmount;
  fee;
  redeemTxHash;
  bridgeTxHash;
  destinationTxHash;
  errorMessage;
  createdAt;
  updatedAt;
  completedAt;
  constructor(params) {
    this.id = params.id;
    this.publicId = params.publicId;
    this.userId = params.userId;
    this.walletId = params.walletId;
    this.escrowIds = params.escrowIds;
    this.destinationChain = params.destinationChain;
    this.destinationDomain = params.destinationDomain;
    this.recipientAddress = params.recipientAddress;
    this.status = params.status;
    this.estimatedAmount = params.estimatedAmount;
    this.walletProvider = params.walletProvider;
    this.actualAmount = params.actualAmount;
    this.fee = params.fee;
    this.redeemTxHash = params.redeemTxHash;
    this.bridgeTxHash = params.bridgeTxHash;
    this.destinationTxHash = params.destinationTxHash;
    this.errorMessage = params.errorMessage;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
    this.completedAt = params.completedAt;
  }
  markRedeemComplete(txHash) {
    this.redeemTxHash = txHash;
    this.status = "PENDING_BRIDGE" /* PENDING_BRIDGE */;
    this.updatedAt = /* @__PURE__ */ new Date();
    return this;
  }
  markBridgeInitiated(txHash) {
    this.bridgeTxHash = txHash;
    this.status = "BRIDGING" /* BRIDGING */;
    this.updatedAt = /* @__PURE__ */ new Date();
    return this;
  }
  markCompleted(destinationTxHash) {
    this.destinationTxHash = destinationTxHash;
    this.status = "COMPLETED" /* COMPLETED */;
    this.updatedAt = /* @__PURE__ */ new Date();
    this.completedAt = /* @__PURE__ */ new Date();
    return this;
  }
  markFailed(errorMessage) {
    this.errorMessage = errorMessage;
    this.status = "FAILED" /* FAILED */;
    this.updatedAt = /* @__PURE__ */ new Date();
    return this;
  }
  canCreateBridgeChallenge() {
    return this.status === "PENDING_BRIDGE" /* PENDING_BRIDGE */;
  }
  isTerminal() {
    return this.status === "COMPLETED" /* COMPLETED */ || this.status === "FAILED" /* FAILED */;
  }
};
export {
  Withdrawal
};
//# sourceMappingURL=withdrawal.js.map