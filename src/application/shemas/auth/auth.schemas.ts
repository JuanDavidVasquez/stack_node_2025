// src/application/schemas/auth/auth.schemas.ts
import { z } from 'zod';

/**
 * Schema para validación de login
 */
export const LoginSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .trim()
    .toLowerCase(),
  
  password: z.string()
    .min(1, 'Password is required')
    .max(100, 'Password must be less than 100 characters'),
    
  rememberMe: z.boolean()
    .optional()
    .default(false)
}).strict();

/**
 * Schema para refresh token
 */
export const RefreshTokenSchema = z.object({
  refreshToken: z.string()
    .min(1, 'Refresh token is required')
}).strict();

/**
 * Schema para logout
 */
export const LogoutSchema = z.object({
  refreshToken: z.string()
    .optional() // Opcional porque puede venir del header Authorization
}).strict();

/**
 * Schema para verificar token
 */
export const VerifyTokenSchema = z.object({
  token: z.string()
    .min(1, 'Token is required')
}).strict();

/**
 * Schema para cambio de contraseña
 */
export const ChangePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, 'Current password is required'),
    
  newPassword: z.string()
    .min(6, 'New password must be at least 6 characters')
    .max(100, 'New password must be less than 100 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'New password must contain at least one uppercase letter, one lowercase letter, and one number'),
    
  confirmPassword: z.string()
    .min(1, 'Password confirmation is required')
}).strict()
.refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

/**
 * Schema para recuperación de contraseña (solicitud)
 */
export const ForgotPasswordSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .trim()
    .toLowerCase()
}).strict();

/**
 * Schema para reset de contraseña
 */
export const ResetPasswordSchema = z.object({
  token: z.string()
    .min(1, 'Reset token is required'),
    
  newPassword: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    
  confirmPassword: z.string()
    .min(1, 'Password confirmation is required')
}).strict()
.refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

/**
 * Schema para desbloquear cuenta (admin)
 */
export const UnlockAccountSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .trim()
    .toLowerCase()
}).strict();

// Tipos derivados de los schemas
export type LoginSchemaType = z.infer<typeof LoginSchema>;
export type RefreshTokenSchemaType = z.infer<typeof RefreshTokenSchema>;
export type LogoutSchemaType = z.infer<typeof LogoutSchema>;
export type VerifyTokenSchemaType = z.infer<typeof VerifyTokenSchema>;
export type ChangePasswordSchemaType = z.infer<typeof ChangePasswordSchema>;
export type ForgotPasswordSchemaType = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordSchemaType = z.infer<typeof ResetPasswordSchema>;
export type UnlockAccountSchemaType = z.infer<typeof UnlockAccountSchema>;

/**
 * Funciones helper para validación
 */
export const validateAuthData = {
  login: (data: unknown) => LoginSchema.parse(data),
  refreshToken: (data: unknown) => RefreshTokenSchema.parse(data),
  logout: (data: unknown) => LogoutSchema.parse(data),
  verifyToken: (data: unknown) => VerifyTokenSchema.parse(data),
  changePassword: (data: unknown) => ChangePasswordSchema.parse(data),
  forgotPassword: (data: unknown) => ForgotPasswordSchema.parse(data),
  resetPassword: (data: unknown) => ResetPasswordSchema.parse(data),
  unlockAccount: (data: unknown) => UnlockAccountSchema.parse(data)
};

/**
 * Funciones helper para validación segura
 */
export const safeValidateAuthData = {
  login: (data: unknown) => LoginSchema.safeParse(data),
  refreshToken: (data: unknown) => RefreshTokenSchema.safeParse(data),
  logout: (data: unknown) => LogoutSchema.safeParse(data),
  verifyToken: (data: unknown) => VerifyTokenSchema.safeParse(data),
  changePassword: (data: unknown) => ChangePasswordSchema.safeParse(data),
  forgotPassword: (data: unknown) => ForgotPasswordSchema.safeParse(data),
  resetPassword: (data: unknown) => ResetPasswordSchema.safeParse(data),
  unlockAccount: (data: unknown) => UnlockAccountSchema.safeParse(data)
};