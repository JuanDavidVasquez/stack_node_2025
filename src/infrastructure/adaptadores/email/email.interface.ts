// src/infrastructure/adapters/email/email.interface.ts

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  cid?: string; // Content-ID para imágenes embebidas
}

// Tipo helper para destinatarios flexibles
export type FlexibleRecipient = string | EmailRecipient;
export type FlexibleRecipients = FlexibleRecipient | FlexibleRecipient[];

export interface EmailOptions {
  to: FlexibleRecipients;
  cc?: FlexibleRecipients;
  bcc?: FlexibleRecipients;
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
  priority?: 'high' | 'normal' | 'low';
    // Opcional: soporte para templates
  template?: string;
  variables?: Record<string, any>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailAdapter {
  /**
   * Envía un email
   * @param options Opciones del email
   * @returns Resultado del envío
   */
  sendEmail(options: EmailOptions): Promise<EmailResult>;

  /**
   * Verifica la conexión con el servidor de email
   * @returns true si la conexión es exitosa
   */
  verifyConnection(): Promise<boolean>;
}