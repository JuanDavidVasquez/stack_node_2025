// src/infrastructure/adapters/uuid/uuid.adapter.ts
import { v4 as uuidv4, validate } from 'uuid';
import { UuidAdapter } from './uuid.interface';
import { InfrastructureError } from '../../../shared/errors/infrastructure.error';

export class UuidV4Adapter implements UuidAdapter {
  /**
   * Genera un UUID v4
   * @returns UUID v4 en formato string
   */
  generate(): string {
    try {
      return uuidv4();
    } catch (error) {
      throw new InfrastructureError(`Error generating UUID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Valida si una cadena es un UUID válido
   * @param uuid String a validar
   * @returns true si es un UUID válido, false en caso contrario
   */
  validate(uuid: string): boolean {
    try {
      return validate(uuid);
    } catch (error) {
      return false;
    }
  }
}