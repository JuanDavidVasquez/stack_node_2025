// src/interfaces/http/controllers/email-verification.controller.ts
import { Request, Response, NextFunction } from 'express';
import { EmailVerificationService } from '../../../infrastructure/services/email-verification.service';
import setupLogger from '../../../infrastructure/utils/logger';
import { config } from '../../../infrastructure/database/config/env';

export class EmailVerificationController {
    private readonly logger = setupLogger({
        ...config.logging,
        dir: `${config.logging.dir}/controllers`,
    });

    constructor(private readonly emailVerificationService: EmailVerificationService) {
        this.logger.info('EmailVerificationController initialized');

        // Binding de métodos para conservar el contexto 'this'
        this.sendVerificationCode = this.sendVerificationCode.bind(this);
        this.verifyCode = this.verifyCode.bind(this);
        this.resendVerificationCode = this.resendVerificationCode.bind(this);
    }

    /**
     * POST /api/v1/email-verification/send
     * Envía código de verificación de email
     */
    public async sendVerificationCode(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            this.logger.info('Sending email verification code...');
            await this.emailVerificationService.sendVerificationCode(req, res, next);
        } catch (error) {
            this.logger.error('Error in sendVerificationCode controller:', error);
            next(error);
        }
    }

    /**
     * POST /api/v1/email-verification/verify
     * Verifica código de email
     */
    public async verifyCode(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            this.logger.info('Verifying email code...');
            await this.emailVerificationService.verifyCode(req, res, next);
        } catch (error) {
            this.logger.error('Error in verifyCode controller:', error);
            next(error);
        }
    }

    /**
     * POST /api/v1/email-verification/resend
     * Reenvía código de verificación
     */
    public async resendVerificationCode(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            this.logger.info('Resending email verification code...');
            await this.emailVerificationService.resendVerificationCode(req, res, next);
        } catch (error) {
            this.logger.error('Error in resendVerificationCode controller:', error);
            next(error);
        }
    }
}