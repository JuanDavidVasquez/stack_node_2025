// src/application/dtos/request/auth/login-request.dto.ts

import { LoginSchemaType, safeValidateAuthData, validateAuthData } from "../../../shemas/auth/auth.schemas";


/**
 * DTO para la solicitud de login
 */
export type LoginRequestDTO = LoginSchemaType;

/**
 * Función para validar los datos de login
 */
export const validateLoginRequest = (data: unknown): LoginRequestDTO => {
  return validateAuthData.login(data);
};

/**
 * Función para validación segura
 */
export const safeValidateLoginRequest = (data: unknown) => {
  return safeValidateAuthData.login(data);
};