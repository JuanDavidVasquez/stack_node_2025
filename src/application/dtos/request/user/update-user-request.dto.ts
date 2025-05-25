// src/application/dtos/request/user/update-user-request.dto.ts

import { safeValidateUserData, UpdateUserSchemaType, validateUserData } from "../../../shemas/user.shemas";

/**
 * DTO para la solicitud de actualización de usuario
 * Derivado del schema de Zod para mantener consistencia
 */
export type UpdateUserRequestDTO = UpdateUserSchemaType;

/**
 * Función para validar los datos de actualización de usuario
 * @param data Datos a validar
 * @returns Datos validados y transformados
 * @throws ZodError si la validación falla
 */
export const validateUpdateUserRequest = (data: unknown): UpdateUserRequestDTO => {
  return validateUserData.updateUser(data);
};

/**
 * Función para validación segura (no lanza errores)
 * @param data Datos a validar
 * @returns Resultado de validación con success boolean
 */
export const safeValidateUpdateUserRequest = (data: unknown) => {
  return safeValidateUserData.updateUser(data);
};