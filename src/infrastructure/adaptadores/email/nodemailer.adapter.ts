// src/infrastructure/adapters/email/nodemailer.adapter.ts
import * as nodemailer from 'nodemailer';
import { 
  EmailAdapter, 
  EmailOptions, 
  EmailResult, 
  EmailRecipient, 
  EmailAttachment,
  FlexibleRecipients
} from './email.interface';
import { TemplateService } from '../../services/template.service';
import { setupLogger } from '../../utils/logger';
import { config } from '../../database/config/env';

/**
 * Implementación del adaptador de email usando Nodemailer con soporte de plantillas
 */
export class NodemailerAdapter implements EmailAdapter {
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/adapters/email`,
  });
  
  private transporter: nodemailer.Transporter;
  private templateService: TemplateService;

  constructor() {
    // Configurar el transporter
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.pass
      },
      // Configuraciones adicionales para mejorar la entregabilidad
      pool: true, // Usar pool de conexiones
      maxConnections: 5,
      maxMessages: 100,
      rateLimit: 14, // Límite de emails por segundo
      tls: {
        // No fallar en certificados autofirmados en desarrollo
        rejectUnauthorized: config.app.env === 'production'
      }
    });

    // Inicializar servicio de plantillas
    this.templateService = TemplateService.getInstance();

    this.logger.info('NodemailerAdapter initialized with template support');

    // Verificar conexión al inicializar (en desarrollo)
    if (config.app.env === 'development') {
      this.verifyConnection().then(isConnected => {
        if (isConnected) {
          this.logger.info('Email connection verified successfully');
        } else {
          this.logger.warn('Email connection verification failed');
        }
      }).catch(error => {
        this.logger.error('Error verifying email connection:', error);
      });
    }
  }

  /**
   * Normaliza un destinatario flexible a EmailRecipient
   */
  private normalizeRecipient(recipient: string | EmailRecipient): EmailRecipient {
    return typeof recipient === 'string' ? { email: recipient } : recipient;
  }

  /**
   * Convierte FlexibleRecipients a formato de Nodemailer
   */
  private formatRecipients(recipients: FlexibleRecipients): string {
    // Convertir a array si no lo es
    const recipientArray = Array.isArray(recipients) ? recipients : [recipients];
    
    // Normalizar cada destinatario y formatear
    return recipientArray
      .map(recipient => this.normalizeRecipient(recipient))
      .map(recipient => recipient.name ? `"${recipient.name}" <${recipient.email}>` : recipient.email)
      .join(', ');
  }

  /**
   * Convierte EmailAttachment a formato de Nodemailer
   */
  private formatAttachments(attachments: EmailAttachment[]): NonNullable<nodemailer.SendMailOptions['attachments']> {
    return attachments.map(attachment => ({
      filename: attachment.filename,
      content: attachment.content,
      contentType: attachment.contentType,
      cid: attachment.cid
    }));
  }

  /**
   * Envía un email
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      const toEmails = Array.isArray(options.to) 
        ? options.to.map(r => this.normalizeRecipient(r).email).join(', ')
        : this.normalizeRecipient(options.to).email;
      
      this.logger.info(`Sending email to: ${toEmails}`);

      // Si estamos en modo test, solo loguear sin enviar
      if (config.email.testMode) {
        this.logger.info('Email test mode enabled - email not sent');
        this.logger.debug('Email content:', {
          to: options.to,
          subject: options.subject,
          template: options.template || 'No template',
          variables: options.variables || 'No variables',
          text: options.text?.substring(0, 100) + '...',
          html: options.html ? 'HTML content present' : 'No HTML content'
        });
        
        return {
          success: true,
          messageId: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
      }

      // Preparar las opciones del email para Nodemailer
      const mailOptions: nodemailer.SendMailOptions = {
        from: config.email.from,
        to: this.formatRecipients(options.to),
        subject: options.subject,
        replyTo: options.replyTo
      };

      // Agregar campos opcionales si existen
      if (options.cc) {
        mailOptions.cc = this.formatRecipients(options.cc);
      }

      if (options.bcc) {
        mailOptions.bcc = this.formatRecipients(options.bcc);
      }

      if (options.attachments && options.attachments.length > 0) {
        mailOptions.attachments = this.formatAttachments(options.attachments);
      }

      if (options.priority) {
        mailOptions.priority = options.priority;
      }

      // Procesar plantilla si se proporciona
      if (options.template && options.variables) {
        this.logger.debug(`Processing template: ${options.template}`);
        
        try {
          // Verificar que la plantilla existe
          if (!this.templateService.templateExists(options.template)) {
            throw new Error(`Template '${options.template}' not found`);
          }

          // Renderizar la plantilla
          const rendered = this.templateService.renderTemplate(
            options.template, 
            {
              ...options.variables,
              subject: options.subject
            }
          );

          // Usar el contenido renderizado
          mailOptions.html = rendered.html;
          mailOptions.text = rendered.text;

          this.logger.debug(`Template ${options.template} processed successfully`);
        } catch (templateError) {
          this.logger.error(`Error processing template ${options.template}:`, templateError);
          
          // Fallback: usar texto plano si hay error con la plantilla
          mailOptions.text = options.text || `Error processing template: ${options.template}`;
          
          // En desarrollo, lanzar el error; en producción, continuar con fallback
          if (config.app.env === 'development') {
            throw templateError;
          }
        }
      } else {
        // Sin plantilla, usar el contenido proporcionado directamente
        mailOptions.text = options.text;
        mailOptions.html = options.html;
      }

      // Asegurar que haya al menos contenido de texto
      if (!mailOptions.html && !mailOptions.text) {
        mailOptions.text = 'This email was sent without content.';
        this.logger.warn('Email sent without HTML or text content');
      }

      // Enviar el email
      const info = await this.transporter.sendMail(mailOptions);

      this.logger.info(`Email sent successfully. Message ID: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId
      };

    } catch (error) {
      this.logger.error('Error sending email:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Verifica la conexión con el servidor de email
   */
  async verifyConnection(): Promise<boolean> {
    try {
      this.logger.debug('Verifying email connection...');
      await this.transporter.verify();
      this.logger.debug('Email connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('Email connection verification failed:', error);
      return false;
    }
  }

  /**
   * Obtiene la lista de plantillas disponibles
   */
  public getAvailableTemplates(): string[] {
    return this.templateService.getAvailableTemplates();
  }

  /**
   * Cierra la conexión del transporter (útil para testing y shutdown)
   */
  async close(): Promise<void> {
    try {
      if (this.transporter) {
        this.transporter.close();
        this.logger.info('Email transporter closed');
      }
    } catch (error) {
      this.logger.error('Error closing email transporter:', error);
    }
  }
}