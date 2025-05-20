// src/infrastructure/adapters/encryption/bcrypt.adapter.ts
import * as bcrypt from 'bcrypt';
import { EncryptionAdapter } from './encryption.interface';
import { InfrastructureError } from '../../../shared/errors/infrastructure.error';
import { setupLogger } from '../../utils/logger';
import { config } from '../../database/config/env';

export class BcryptAdapter implements EncryptionAdapter {
  private readonly saltRounds: number = 10;
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/adapters/encryption`,
  });

  constructor(saltRounds?: number) {
    if (saltRounds) {
      this.saltRounds = saltRounds;
    }
    this.logger.info(`BcryptAdapter initialized with ${this.saltRounds} salt rounds`);
  }

  /**
   * Encripta una contraseña usando bcrypt
   * @param plainPassword Contraseña en texto plano
   * @returns Contraseña encriptada
   */
  async hash(plainPassword: string): Promise<string> {
    try {
      this.logger.debug('Generating password hash');
      return await bcrypt.hash(plainPassword, this.saltRounds);
    } catch (error) {
      this.logger.error('Error hashing password:', error);
      throw new InfrastructureError(`Error hashing password: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verifica si una contraseña en texto plano coincide con una encriptada
   * @param plainPassword Contraseña en texto plano
   * @param hashedPassword Contraseña encriptada
   * @returns true si coinciden, false en caso contrario
   */
  async compare(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      this.logger.debug('Comparing password');
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      this.logger.error('Error comparing password:', error);
      throw new InfrastructureError(`Error comparing password: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}