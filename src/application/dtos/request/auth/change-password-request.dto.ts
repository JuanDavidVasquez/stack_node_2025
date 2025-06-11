// src/application/dtos/request/auth/change-password-request.dto.ts
import { ChangePasswordSchemaType, safeValidateAuthData, validateAuthData } from "../../../shemas/auth/auth.schemas";

/**
 * DTO para la solicitud de cambio de contraseña
 */
export type ChangePasswordRequestDTO = ChangePasswordSchemaType;

/**
 * Función para validar los datos de cambio de contraseña
 */
export const validateChangePasswordRequest = (data: unknown): ChangePasswordRequestDTO => {
  return validateAuthData.changePassword(data);
};

/**
 * Función para validación segura
 */
export const safeValidateChangePasswordRequest = (data: unknown) => {
  return safeValidateAuthData.changePassword(data);
};