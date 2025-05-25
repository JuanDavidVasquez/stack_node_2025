// src/application/dtos/request/user/create-user-request.dto.ts

import { CreateUserSchemaType, safeValidateUserData, validateUserData } from "../../../shemas/user.shemas";

/**
 * DTO para la solicitud de creación de usuario
 * Derivado del schema de Zod para mantener consistencia
 */
export type CreateUserRequestDTO = CreateUserSchemaType;

/**
 * Función para validar los datos de creación de usuario
 * @param data Datos a validar
 * @returns Datos validados y transformados
 * @throws ZodError si la validación falla
 */
export const validateCreateUserRequest = (data: unknown): CreateUserRequestDTO => {
  return validateUserData.createUser(data);
};

/**
 * Función para validación segura (no lanza errores)
 * @param data Datos a validar
 * @returns Resultado de validación con success boolean
 */
export const safeValidateCreateUserRequest = (data: unknown) => {
  return safeValidateUserData.createUser(data);
};