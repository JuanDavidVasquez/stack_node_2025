// src/infrastructure/services/email.service.ts
import { EmailAdapter, EmailOptions, EmailResult, FlexibleRecipients } from '../adaptadores/email/email.interface';
import { NodemailerAdapter } from '../adaptadores/email/nodemailer.adapter';
import { InfrastructureError } from '../../shared/errors/infrastructure.error';
import { setupLogger } from '../utils/logger';
import { config } from '../database/config/env';

/**
 * Opciones para envío de email con template
 */
export interface TemplateEmailOptions {
  template: string; // Nombre del archivo .hbs (ej: "verification", "welcome")
  subject: string;  // Asunto del email
  variables: Record<string, any>; // Variables para el template
  to: FlexibleRecipients;
  cc?: FlexibleRecipients;
  bcc?: FlexibleRecipients;
  replyTo?: string;
  priority?: 'high' | 'normal' | 'low';
}

/**
 * Servicio de emails que actúa como capa de abstracción
 * Permite cambiar fácilmente el proveedor de emails sin afectar el resto de la aplicación
 */
export class EmailService {
  private static instance: EmailService;
  private emailAdapter: EmailAdapter;
  private readonly logger;

  private constructor() {
    this.logger = setupLogger({
      ...config.logging,
      dir: `${config.logging.dir}/services`,
    });

    // Por defecto usar Nodemailer, pero puede cambiarse fácilmente
    this.emailAdapter = new NodemailerAdapter();
    
    this.logger.info('EmailService initialized');
  }

  /**
   * Obtener la instancia singleton del EmailService
   */
  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Cambiar el adaptador de email (útil para testing o cambio de proveedor)
   */
  public setAdapter(adapter: EmailAdapter): void {
    this.emailAdapter = adapter;
    this.logger.info('Email adapter changed');
  }

  /**
   * Enviar un email genérico (sin template)
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      this.logger.info('Sending email via EmailService');
      return await this.emailAdapter.sendEmail(options);
    } catch (error) {
      this.logger.error('Error in EmailService.sendEmail:', error);
      throw new InfrastructureError(`EmailService error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enviar email usando un template (.hbs)
   */
  async sendTemplateEmail(options: TemplateEmailOptions): Promise<EmailResult> {
    try {
      this.logger.info(`Sending template email: ${options.template}`);
      
      // Construir las opciones para el adaptador
      const emailOptions: EmailOptions = {
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        replyTo: options.replyTo,
        priority: options.priority,
        template: options.template,
        variables: options.variables
      };

      return await this.emailAdapter.sendEmail(emailOptions);
    } catch (error) {
      this.logger.error(`Error sending template email ${options.template}:`, error);
      throw new InfrastructureError(`EmailService template error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verificar conexión del email
   */
  async verifyConnection(): Promise<boolean> {
    try {
      return await this.emailAdapter.verifyConnection();
    } catch (error) {
      this.logger.error('Error verifying email connection:', error);
      return false;
    }
  }

  /**
   * Enviar email de prueba (útil para verificar configuración)
   */
  async sendTestEmail(recipientEmail: string): Promise<EmailResult> {
    try {
      this.logger.info(`Sending test email to: ${recipientEmail}`);
      
      return await this.sendEmail({
        to: recipientEmail,
        subject: `Test Email from ${config.app.name}`,
        text: `This is a test email from ${config.app.name} sent at ${new Date().toISOString()}`,
        html: `
          <h2>Test Email</h2>
          <p>This is a test email from <strong>${config.app.name}</strong></p>
          <p><strong>Environment:</strong> ${config.app.env}</p>
          <p><strong>Version:</strong> ${config.app.version}</p>
          <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
          <p>If you received this email, your email configuration is working correctly! 🎉</p>
        `
      });
    } catch (error) {
      this.logger.error('Error sending test email:', error);
      throw new InfrastructureError(`Error sending test email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cerrar conexiones (útil para shutdown)
   */
  async close(): Promise<void> {
    try {
      if (this.emailAdapter && typeof (this.emailAdapter as any).close === 'function') {
        await (this.emailAdapter as any).close();
      }
      this.logger.info('EmailService closed');
    } catch (error) {
      this.logger.error('Error closing EmailService:', error);
    }
  }
}