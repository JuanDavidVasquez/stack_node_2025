// src/application/dtos/response/email-verification/verification-response.dto.ts
export interface SendVerificationResponseDTO {
  success: boolean;
  message: string;
  expiresAt: Date;
  codeId: string;
}

export interface VerifyCodeResponseDTO {
  success: boolean;
  message: string;
  userActivated: boolean;
}

export interface ResendVerificationResponseDTO {
  success: boolean;
  message: string;
  expiresAt: Date;
  waitTimeSeconds?: number;
}
