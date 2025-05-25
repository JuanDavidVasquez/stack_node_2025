import { GetUsersQuerySchemaType, safeValidateUserData, validateUserData } from "../../../shemas/user.shemas";

/**
 * DTO para la solicitud de listado de usuarios con opciones de filtrado y paginación
 * Derivado del schema de Zod para mantener consistencia
 */
export type GetUsersRequestDTO = GetUsersQuerySchemaType;

/**
 * Función para validar query parameters de get users
 * @param data Datos a validar
 * @returns Datos validados y transformados
 * @throws ZodError si la validación falla
 */
export const validateGetUsersRequest = (data: unknown): GetUsersRequestDTO => {
  return validateUserData.getUsersQuery(data);
};

/**
 * Función para validación segura (no lanza errores)
 * @param data Datos a validar
 * @returns Resultado de validación con success boolean
 */
export const safeValidateGetUsersRequest = (data: unknown) => {
  return safeValidateUserData.getUsersQuery(data);
};