// src/application/dtos/request/auth/forgot-password-request.dto.ts
import { ForgotPasswordSchemaType, safeValidateAuthData, validateAuthData } from "../../../shemas/auth/auth.schemas";

/**
 * DTO para la solicitud de recuperación de contraseña
 */
export type ForgotPasswordRequestDTO = ForgotPasswordSchemaType;

/**
 * Función para validar los datos de recuperación de contraseña
 */
export const validateForgotPasswordRequest = (data: unknown): ForgotPasswordRequestDTO => {
  return validateAuthData.forgotPassword(data);
};

/**
 * Función para validación segura
 */
export const safeValidateForgotPasswordRequest = (data: unknown) => {
  return safeValidateAuthData.forgotPassword(data);
};