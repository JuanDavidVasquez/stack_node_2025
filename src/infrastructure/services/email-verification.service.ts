
// src/infrastructure/services/email-verification.service.ts
import { Request, Response, NextFunction } from 'express';
import { ApplicationError } from '../../shared/errors/application.error';
import { setupLogger } from '../utils/logger';
import { config } from '../database/config/env';
import { SendEmailVerificationUseCase } from '../../application/use-case/email-verification/send-email-verification.use-case';
import { VerifyEmailCodeUseCase } from '../../application/use-case/email-verification/verify-email-code.use-case';
import { ResendEmailVerificationUseCase } from '../../application/use-case/email-verification/resend-email-verification.use-case';

export class EmailVerificationService {
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/services`,
  });

  constructor(
    private readonly sendEmailVerificationUseCase: SendEmailVerificationUseCase,
    private readonly verifyEmailCodeUseCase: VerifyEmailCodeUseCase,
    private readonly resendEmailVerificationUseCase: ResendEmailVerificationUseCase
  ) {}

  /**
   * Envía un código de verificación de email
   */
 async sendVerificationCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ApplicationError('Email is required');
    }

    const result = await this.sendEmailVerificationUseCase.execute({ email });

    // Usar código de estado 200 para todos los casos exitosos
    const statusCode = result.alreadyVerified ? 200 : 200;
    const status = result.alreadyVerified ? 'info' : 'success';

    res.status(statusCode).json({
      status,
      message: result.message,
      data: {
        expiresAt: result.expiresAt,
        codeId: result.codeId,
        alreadyVerified: result.alreadyVerified || false
      }
    });
  } catch (error) {
    this.logger.error('Error in sendVerificationCode:', error);
    
    if (error instanceof ApplicationError) {
      res.status(400).json({
        status: 'error',
        message: error.message
      });
      return;
    }

    next(error);
  }
}
  /**
   * Verifica un código de email
   */
  async verifyCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        throw new ApplicationError('Email and code are required');
      }

      const result = await this.verifyEmailCodeUseCase.execute({ email, code });

      res.status(200).json({
        status: 'success',
        message: result.message,
        data: {
          userActivated: result.userActivated
        }
      });
    } catch (error) {
      this.logger.error('Error in verifyCode:', error);
      
      if (error instanceof ApplicationError) {
        res.status(400).json({
          status: 'error',
          message: error.message
        });
        return;
      }

      next(error);
    }
  }

  /**
   * Reenvía un código de verificación
   */
  async resendVerificationCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        throw new ApplicationError('Email is required');
      }

      const result = await this.resendEmailVerificationUseCase.execute({ email });

      res.status(200).json({
        status: 'success',
        message: result.message,
        data: {
          expiresAt: result.expiresAt,
          waitTimeSeconds: result.waitTimeSeconds
        }
      });
    } catch (error) {
      this.logger.error('Error in resendVerificationCode:', error);
      
      if (error instanceof ApplicationError) {
        const statusCode = error.message.includes('wait') ? 429 : 400;
        res.status(statusCode).json({
          status: 'error',
          message: error.message
        });
        return;
      }

      next(error);
    }
  }
}