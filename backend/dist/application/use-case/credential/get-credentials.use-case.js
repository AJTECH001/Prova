// src/application/use-case/credential/get-credentials.use-case.ts
var GetCredentialsUseCase = class {
  constructor(credentialRepository) {
    this.credentialRepository = credentialRepository;
  }
  credentialRepository;
  async execute(userId) {
    const credentials = await this.credentialRepository.findByUserId(userId);
    return {
      credentials: credentials.map((c) => ({
        client_id: c.clientId,
        status: c.status,
        created_at: c.createdAt.toISOString(),
        last_used_at: c.lastUsedAt?.toISOString()
      }))
    };
  }
};
export {
  GetCredentialsUseCase
};
//# sourceMappingURL=get-credentials.use-case.js.map