// src/infrastructure/adapters/uuid/uuid.interface.ts
export interface UuidAdapter {
  generate(): string;
  validate(uuid: string): boolean;
}