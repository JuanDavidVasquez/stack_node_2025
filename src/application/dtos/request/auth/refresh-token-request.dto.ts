// src/application/dtos/request/auth/refresh-token-request.dto.ts

import { RefreshTokenSchemaType, safeValidateAuthData, validateAuthData } from "../../../shemas/auth/auth.schemas";

/**
 * DTO para la solicitud de refresh token
 */
export type RefreshTokenRequestDTO = RefreshTokenSchemaType;

/**
 * Función para validar los datos de refresh token
 */
export const validateRefreshTokenRequest = (data: unknown): RefreshTokenRequestDTO => {
  return validateAuthData.refreshToken(data);
};

/**
 * Función para validación segura
 */
export const safeValidateRefreshTokenRequest = (data: unknown) => {
  return safeValidateAuthData.refreshToken(data);
};