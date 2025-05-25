// src/application/dtos/request/user/delete-user-request.dto.ts

import { DeleteUserSchemaType, safeValidateUserData, validateUserData } from "../../../shemas/user.shemas";

/**
 * DTO para la solicitud de eliminación de usuario
 * Derivado del schema de Zod para mantener consistencia
 */
export type DeleteUserRequestDTO = DeleteUserSchemaType;

/**
 * Función para validar los datos de eliminación de usuario
 * @param data Datos a validar
 * @returns Datos validados y transformados
 * @throws ZodError si la validación falla
 */
export const validateDeleteUserRequest = (data: unknown): DeleteUserRequestDTO => {
  return validateUserData.deleteUser(data);
};

/**
 * Función para validación segura (no lanza errores)
 * @param data Datos a validar
 * @returns Resultado de validación con success boolean
 */
export const safeValidateDeleteUserRequest = (data: unknown) => {
  return safeValidateUserData.deleteUser(data);
};