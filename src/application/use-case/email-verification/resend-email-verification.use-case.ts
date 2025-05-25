import { EmailVerificationRepository } from "../../../domain/repositories/email-verification.repository";
import { UserRepository } from "../../../domain/repositories/user.repository";
import { UuidAdapter } from "../../../infrastructure/adaptadores";
import { config } from "../../../infrastructure/database/config/env";
import { EmailService } from "../../../infrastructure/services/email.service";
import setupLogger from "../../../infrastructure/utils/logger";
import { ApplicationError } from "../../../shared/errors/application.error";
import { SendEmailVerificationUseCase } from "./send-email-verification.use-case";

// src/application/use-cases/email-verification/resend-email-verification.use-case.ts
export interface ResendEmailVerificationRequest {
  email: string;
}

export interface ResendEmailVerificationResponse {
  success: boolean;
  message: string;
  expiresAt: Date;
  waitTimeSeconds?: number;
}

/**
 * Caso de uso para reenviar código de verificación
 */
export class ResendEmailVerificationUseCase {
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/use-cases`,
  });

  private readonly MIN_RESEND_INTERVAL_SECONDS = 60; // 1 minuto mínimo entre reenvíos

  constructor(
    private readonly emailVerificationRepository: EmailVerificationRepository,
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService,
    private readonly uuidAdapter: UuidAdapter
  ) {}

  async execute(request: ResendEmailVerificationRequest): Promise<ResendEmailVerificationResponse> {
    try {
      this.logger.info(`Resending email verification to: ${request.email}`);

      // Validar email
      if (!request.email || !request.email.includes('@')) {
        throw new ApplicationError('Invalid email format');
      }

      // Verificar si el usuario existe
      const user = await this.userRepository.findByEmail(request.email);
      if (!user) {
        throw new ApplicationError('User not found');
      }

      // Verificar si el usuario ya está verificado
      if (user.isActive) {
        throw new ApplicationError('Email is already verified');
      }

      // Verificar límite de tiempo para reenvío
      const latestVerification = await this.emailVerificationRepository.findLatestValidByEmail(request.email);
      
      if (latestVerification) {
        const timeSinceLastCode = (new Date().getTime() - latestVerification.createdAt.getTime()) / 1000;
        
        if (timeSinceLastCode < this.MIN_RESEND_INTERVAL_SECONDS) {
          const waitTime = this.MIN_RESEND_INTERVAL_SECONDS - Math.floor(timeSinceLastCode);
          throw new ApplicationError(`Please wait ${waitTime} seconds before requesting a new code`);
        }
      }

      // Usar el caso de uso de envío
      const sendUseCase = new SendEmailVerificationUseCase(
        this.emailVerificationRepository,
        this.userRepository,
        this.emailService,
        this.uuidAdapter
      );

      const result = await sendUseCase.execute({ email: request.email });

      return {
        success: result.success,
        message: 'Verification code resent successfully',
        expiresAt: result.expiresAt
      };
    } catch (error) {
      this.logger.error('Error resending email verification:', error);
      
      if (error instanceof ApplicationError) {
        throw error;
      }

      throw new ApplicationError(`Error resending verification email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
