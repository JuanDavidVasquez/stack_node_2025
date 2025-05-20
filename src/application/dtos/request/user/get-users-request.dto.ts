// src/application/dtos/request/user/get-users-request.dto.ts
import { UserRole } from "../../../../shared/constants/roles";

/**
 * DTO para la solicitud de listado de usuarios con opciones de filtrado y paginación
 */
export interface GetUsersRequestDTO {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}