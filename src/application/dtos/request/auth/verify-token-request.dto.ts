// src/application/dtos/request/auth/verify-token-request.dto.ts
import { VerifyTokenSchemaType, safeValidateAuthData, validateAuthData } from "../../../shemas/auth/auth.schemas";

/**
 * DTO para la solicitud de verificación de token
 */
export type VerifyTokenRequestDTO = VerifyTokenSchemaType;

/**
 * Función para validar los datos de verificación de token
 */
export const validateVerifyTokenRequest = (data: unknown): VerifyTokenRequestDTO => {
  return validateAuthData.verifyToken(data);
};

/**
 * Función para validación segura
 */
export const safeValidateVerifyTokenRequest = (data: unknown) => {
  return safeValidateAuthData.verifyToken(data);
};