
// src/application/use-cases/email-verification/verify-email-code.use-case.ts
import { EmailVerificationRepository } from '../../../domain/repositories/email-verification.repository';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { ApplicationError } from '../../../shared/errors/application.error';
import { setupLogger } from '../../../infrastructure/utils/logger';
import { config } from '../../../infrastructure/database/config/env';

export interface VerifyEmailCodeRequest {
  email: string;
  code: string;
}

export interface VerifyEmailCodeResponse {
  success: boolean;
  message: string;
  userActivated: boolean;
}

/**
 * Caso de uso para verificar código de email
 */
export class VerifyEmailCodeUseCase {
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/use-cases`,
  });

  constructor(
    private readonly emailVerificationRepository: EmailVerificationRepository,
    private readonly userRepository: UserRepository
  ) {}

  async execute(request: VerifyEmailCodeRequest): Promise<VerifyEmailCodeResponse> {
    try {
      this.logger.info(`Verifying email code for: ${request.email}`);

      // Validar entrada
      if (!request.email || !request.email.includes('@')) {
        throw new ApplicationError('Invalid email format');
      }

      if (!request.code || request.code.trim().length !== 6) {
        throw new ApplicationError('Verification code must be 6 digits');
      }

      // Buscar el código de verificación
      const verification = await this.emailVerificationRepository.findByEmailAndCode(
        request.email, 
        request.code.trim()
      );

      if (!verification) {
        throw new ApplicationError('Invalid verification code');
      }

      // Verificar si el código puede ser usado
      if (!verification.canBeUsed()) {
        if (verification.isUsed) {
          throw new ApplicationError('Verification code has already been used');
        }
        if (verification.isExpired()) {
          throw new ApplicationError('Verification code has expired');
        }
      }

      // Marcar código como usado
      verification.markAsUsed();
      await this.emailVerificationRepository.update(verification);

      // Activar usuario
      const user = await this.userRepository.findByEmail(request.email);
      if (!user) {
        throw new ApplicationError('User not found');
      }

      let userActivated = false;
      if (!user.isActive) {
        user.activate(); // Método de la entidad User
        await this.userRepository.update(user);
        userActivated = true;
        this.logger.info(`User activated: ${user.email}`);
      }

      this.logger.info(`Email verification successful for: ${request.email}`);

      return {
        success: true,
        message: 'Email verified successfully',
        userActivated
      };
    } catch (error) {
      this.logger.error('Error verifying email code:', error);
      
      if (error instanceof ApplicationError) {
        throw error;
      }

      throw new ApplicationError(`Error verifying email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}