// src/application/dtos/response/user/delete-user-response.dto.ts
/**
 * DTO para la respuesta de eliminación de usuario
 */
export interface DeleteUserResponseDTO {
    id: string;
    message: string;
    deletedAt: Date;
}