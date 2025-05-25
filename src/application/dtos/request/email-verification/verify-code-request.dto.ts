import z from "zod";

// src/application/dtos/request/email-verification/verify-code-request.dto.ts
export const VerifyCodeRequestSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .trim()
    .toLowerCase(),
  code: z.string()
    .min(6, 'Verification code must be 6 digits')
    .max(6, 'Verification code must be 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only numbers')
    .transform(val => val.trim().toUpperCase())
});

export type VerifyCodeRequestDTO = z.infer<typeof VerifyCodeRequestSchema>;

export const validateVerifyCodeRequest = (data: unknown): VerifyCodeRequestDTO => {
  return VerifyCodeRequestSchema.parse(data);
};