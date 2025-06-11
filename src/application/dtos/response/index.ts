// src/application/dtos/response/index.ts
// User DTOs
export * from './user/user-response.dto';
export * from './user/users-response.dto';
export * from './user/delete-user-response.dto';

// Auth DTOs
export * from './auth/auth-response.dto';

// Email Verification DTOs
export * from './email-verification/verification-response.dto';

// Re-export para mantener compatibilidad si alguien usaba AuthUserResponseDTO
export type { AuthenticatedUserDTO as AuthUserResponseDTO } from './auth/auth-response.dto';