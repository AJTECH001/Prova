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
export {
  EncryptedValue
};
//# sourceMappingURL=encrypted-value.js.map