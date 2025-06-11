// src/application/dtos/request/auth/unlock-account-request.dto.ts
import { UnlockAccountSchemaType, safeValidateAuthData, validateAuthData } from "../../../shemas/auth/auth.schemas";

/**
 * DTO para la solicitud de desbloqueo de cuenta (admin)
 */
export type UnlockAccountRequestDTO = UnlockAccountSchemaType;

/**
 * Función para validar los datos de desbloqueo de cuenta
 */
export const validateUnlockAccountRequest = (data: unknown): UnlockAccountRequestDTO => {
  return validateAuthData.unlockAccount(data);
};

/**
 * Función para validación segura
 */
export const safeValidateUnlockAccountRequest = (data: unknown) => {
  return safeValidateAuthData.unlockAccount(data);
};