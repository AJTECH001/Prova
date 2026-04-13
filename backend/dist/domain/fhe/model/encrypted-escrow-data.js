// src/domain/fhe/model/encrypted-value.ts
var EncryptedValue = class _EncryptedValue {
  type;
  data;
  securityZone;
  utype;
  inputProof;
  userAddress;
  constructor(params) {
    this.type = params.type;
    this.data = params.data;
    this.securityZone = params.securityZone;
    this.utype = params.utype;
    this.inputProof = params.inputProof;
    this.userAddress = params.userAddress;
  }
  isForUser(address) {
    return this.userAddress.toLowerCase() === address.toLowerCase();
  }
  toTuple() {
    return [this.data, this.securityZone, this.utype, this.inputProof];
  }
  toJSON() {
    return {
      type: this.type,
      data: this.data,
      securityZone: this.securityZone,
      utype: this.utype,
      inputProof: this.inputProof,
      userAddress: this.userAddress
    };
  }
  static fromJSON(json) {
    const obj = json;
    return new _EncryptedValue({
      type: obj.type,
      data: obj.data,
      securityZone: obj.securityZone,
      utype: obj.utype,
      inputProof: obj.inputProof,
      userAddress: obj.userAddress
    });
  }
};

// src/domain/fhe/model/encrypted-escrow-data.ts
var EncryptedEscrowData = class _EncryptedEscrowData {
  encryptedAmount;
  encryptedOwner;
  userAddress;
  plaintextAmount;
  plaintextOwner;
  constructor(params) {
    this.encryptedAmount = params.encryptedAmount;
    this.encryptedOwner = params.encryptedOwner;
    this.userAddress = params.userAddress;
    this.plaintextAmount = params.plaintextAmount;
    this.plaintextOwner = params.plaintextOwner;
  }
  isForUser(address) {
    return this.userAddress.toLowerCase() === address.toLowerCase();
  }
  getContractCallParameters() {
    return {
      encrypted_owner: this.encryptedOwner.toTuple(),
      encrypted_amount: this.encryptedAmount.toTuple(),
      resolver: "0x0000000000000000000000000000000000000000",
      resolver_data: "0x"
    };
  }
  toJSON() {
    return {
      encryptedAmount: this.encryptedAmount.toJSON(),
      encryptedOwner: this.encryptedOwner.toJSON(),
      userAddress: this.userAddress,
      plaintextAmount: this.plaintextAmount?.toString(),
      plaintextOwner: this.plaintextOwner
    };
  }
  static fromJSON(json) {
    const obj = json;
    return new _EncryptedEscrowData({
      encryptedAmount: EncryptedValue.fromJSON(obj.encryptedAmount),
      encryptedOwner: EncryptedValue.fromJSON(obj.encryptedOwner),
      userAddress: obj.userAddress,
      plaintextAmount: obj.plaintextAmount ? BigInt(obj.plaintextAmount) : void 0,
      plaintextOwner: obj.plaintextOwner
    });
  }
};
export {
  EncryptedEscrowData
};
//# sourceMappingURL=encrypted-escrow-data.js.map