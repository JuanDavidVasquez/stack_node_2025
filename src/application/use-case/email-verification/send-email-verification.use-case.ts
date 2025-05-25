import { EmailVerification } from '../../../domain/entities/email-verification.entity';
import { EmailVerificationRepository } from '../../../domain/repositories/email-verification.repository';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { ApplicationError } from '../../../shared/errors/application.error';
import { setupLogger } from '../../../infrastructure/utils/logger';
import { config } from '../../../infrastructure/database/config/env';
import { EmailService } from '../../../infrastructure/services/email.service';
import { UuidAdapter } from '../../../infrastructure/adaptadores';

export interface SendEmailVerificationRequest {
  email: string;
  expirationMinutes?: number;
}

export interface SendEmailVerificationResponse {
  success: boolean;
  message: string;
  expiresAt: Date;
  codeId: string;
  alreadyVerified?: boolean;
}

/**
 * Caso de uso para enviar código de verificación de email
 */
export class SendEmailVerificationUseCase {
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/use-cases`,
  });

  constructor(
    private readonly emailVerificationRepository: EmailVerificationRepository,
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService,
    private readonly uuidAdapter: UuidAdapter
  ) { }

  async execute(request: SendEmailVerificationRequest): Promise<SendEmailVerificationResponse> {
    try {
      this.logger.info(`Sending email verification to: ${request.email}`);

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
        this.logger.info(`User ${request.email} is already verified, skipping email send`);

        // En lugar de lanzar error, retornar respuesta exitosa
        return {
          success: true,
          message: 'Email is already verified. No verification needed.',
          expiresAt: new Date(), // Fecha dummy
          codeId: 'already-verified',
          alreadyVerified: true // Agregar este campo
        };
      }


      // Marcar códigos anteriores como usados
      await this.emailVerificationRepository.markPreviousAsUsed(request.email);

      // Generar código de 6 dígitos
      const verificationCode = this.generateVerificationCode();

      // Crear nueva verificación
      const emailVerification = EmailVerification.create({
        id: this.uuidAdapter.generate(),
        email: request.email,
        verificationCode,
        expirationMinutes: request.expirationMinutes || 15
      });

      // Guardar en base de datos
      const savedVerification = await this.emailVerificationRepository.save(emailVerification);

      // Enviar email
      await this.sendVerificationEmail(user.email, user.firstName, verificationCode, savedVerification.expiresAt);

      this.logger.info(`Email verification sent successfully to: ${request.email}`);

      return {
        success: true,
        message: 'Verification code sent successfully',
        expiresAt: savedVerification.expiresAt,
        codeId: savedVerification.id
      };
    } catch (error) {
      this.logger.error('Error sending email verification:', error);

      if (error instanceof ApplicationError) {
        throw error;
      }

      throw new ApplicationError(`Error sending verification email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateVerificationCode(): string {
    // Generar código de 6 dígitos
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async sendVerificationEmail(email: string, firstName: string, code: string, expiresAt: Date): Promise<void> {
    try {
      const expirationMinutes = Math.floor((expiresAt.getTime() - new Date().getTime()) / (1000 * 60));

      const templateVariables = {
        email,
        firstName,
        verificationCode: code,
        expirationTime: `${expirationMinutes} minutos`,
        appName: config.app.name,
        appVersion: config.app.version,
        supportEmail: 'support@onelessonperday.com',
        emailType: 'verification',
        currentYear: new Date().getFullYear(),
        timestamp: new Date().toLocaleString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        // URL de verificación opcional (si tienes una página web)
        verificationUrl: `${config.app.baseUrl || 'https://localhost:4000'}/verify-email?code=${code}&email=${encodeURIComponent(email)}`
      };

      const emailResult = await this.emailService.sendTemplateEmail({
        template: 'email-verification',
        to: { email, name: firstName },
        subject: `Verifica tu email - Código: ${code}`,
        variables: templateVariables,
        priority: 'high'
      });

      if (!emailResult.success) {
        throw new ApplicationError(`Failed to send verification email: ${emailResult.error}`);
      }

      this.logger.info(`Verification email sent successfully: ${emailResult.messageId}`);
    } catch (error) {
      this.logger.error('Error sending verification email:', error);
      throw error;
    }
  }
}
