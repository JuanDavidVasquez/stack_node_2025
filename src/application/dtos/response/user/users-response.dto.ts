// src/application/dtos/response/user/users-response.dto.ts
import { UserResponseDTO } from "./user-response.dto";

/**
 * DTO para la respuesta paginada de usuarios
 */
export interface PaginatedUsersResponseDTO {
  data: UserResponseDTO[];
  total: number;
  pages: number;
  currentPage: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}