// src/application/use-case/auth/logout.use-case.ts
var LogoutUseCase = class {
  constructor(sessionRepository) {
    this.sessionRepository = sessionRepository;
  }
  sessionRepository;
  async execute(userId) {
    await this.sessionRepository.deleteByUserId(userId);
  }
};
export {
  LogoutUseCase
};
//# sourceMappingURL=logout.use-case.js.map