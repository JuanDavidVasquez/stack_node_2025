// src/application/dtos/request/user/create-user-request.dto.ts
import { UserRole } from "../../../../shared/constants/roles";

/**
 * DTO para la solicitud de creación de usuario
 * Representa los datos de entrada necesarios para el caso de uso de crear usuario
 */
export interface CreateUserRequestDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}