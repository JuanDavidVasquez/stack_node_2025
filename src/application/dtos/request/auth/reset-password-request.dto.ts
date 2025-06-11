// src/application/dtos/request/auth/reset-password-request.dto.ts
import { ResetPasswordSchemaType, safeValidateAuthData, validateAuthData } from "../../../shemas/auth/auth.schemas";

/**
 * DTO para la solicitud de reset de contraseña
 */
export type ResetPasswordRequestDTO = ResetPasswordSchemaType;

/**
 * Función para validar los datos de reset de contraseña
 */
export const validateResetPasswordRequest = (data: unknown): ResetPasswordRequestDTO => {
  return validateAuthData.resetPassword(data);
};

/**
 * Función para validación segura
 */
export const safeValidateResetPasswordRequest = (data: unknown) => {
  return safeValidateAuthData.resetPassword(data);
};