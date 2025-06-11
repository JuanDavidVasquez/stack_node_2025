// src/application/dtos/request/auth/logout-request.dto.ts
import { LogoutSchemaType, safeValidateAuthData, validateAuthData } from "../../../shemas/auth/auth.schemas";

/**
 * DTO para la solicitud de logout
 */
export type LogoutRequestDTO = LogoutSchemaType;

/**
 * Función para validar los datos de logout
 */
export const validateLogoutRequest = (data: unknown): LogoutRequestDTO => {
  return validateAuthData.logout(data);
};

/**
 * Función para validación segura
 */
export const safeValidateLogoutRequest = (data: unknown) => {
  return safeValidateAuthData.logout(data);
};