// src/infrastructure/adapters/index.ts

// UUID Adapter
export type { UuidAdapter } from './uuid/uuid.interface';
export { UuidV4Adapter } from './uuid/uuid.adapter';

// Encryption Adapter
export type { EncryptionAdapter } from './encryption/encryption.interface';
export { BcryptAdapter } from './encryption/bcrypt.adapter';

// JWT Adapter
export type { JwtAdapter, JwtPayload, TokenPair } from './jwt/jwt.interface';
export { JwtTokenAdapter } from './jwt/jwt.adapter';


// Email Adapter
export type { 
  EmailAdapter, 
  EmailOptions, 
  EmailResult, 
  EmailRecipient, 
  EmailAttachment,
  FlexibleRecipient,
  FlexibleRecipients
} from './email/email.interface';
export { NodemailerAdapter } from './email/nodemailer.adapter';