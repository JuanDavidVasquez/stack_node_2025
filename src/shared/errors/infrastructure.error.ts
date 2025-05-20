// src/shared/errors/infrastructure.error.ts
export class InfrastructureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InfrastructureError';
  }
}