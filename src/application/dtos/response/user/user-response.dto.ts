// src/application/dtos/response/user/user-response.dto.ts
import { UserRole } from "../../../../shared/constants/roles";

/**
 * DTO base para respuestas relacionadas con usuarios
 * Contiene la información común que se devuelve sobre un usuario
 */
export interface UserResponseDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * DTO específico para la respuesta del caso de uso de creación de usuario
 */
export interface CreateUserResponseDTO extends UserResponseDTO {
  // Campos específicos para la respuesta de creación, si los hay
  verificationCode?: string;
}

/**
 * DTO para respuesta de autenticación de usuario (login)
 */
export interface AuthUserResponseDTO extends UserResponseDTO {
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}