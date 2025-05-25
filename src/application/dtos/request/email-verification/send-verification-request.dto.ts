// src/application/dtos/request/email-verification/send-verification-request.dto.ts
import { z } from 'zod';

export const SendVerificationRequestSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .trim()
    .toLowerCase(),
  expirationMinutes: z.number()
    .min(5, 'Expiration must be at least 5 minutes')
    .max(60, 'Expiration cannot exceed 60 minutes')
    .optional()
    .default(15)
});

export type SendVerificationRequestDTO = z.infer<typeof SendVerificationRequestSchema>;

export const validateSendVerificationRequest = (data: unknown): SendVerificationRequestDTO => {
  return SendVerificationRequestSchema.parse(data);
};