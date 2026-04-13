// src/infrastructure/webhook/quicknode-verifier.ts
import { createHmac } from "crypto";
var QuickNodeVerifier = class {
  constructor(secret) {
    this.secret = secret;
  }
  secret;
  verify(payload, signature, nonce, timestamp) {
    const hmac = createHmac("sha256", this.secret);
    hmac.update(nonce + timestamp + payload);
    const digest = hmac.digest("hex");
    return digest === signature;
  }
};
export {
  QuickNodeVerifier
};
//# sourceMappingURL=quicknode-verifier.js.map