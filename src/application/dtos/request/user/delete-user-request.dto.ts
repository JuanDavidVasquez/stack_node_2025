// src/application/dtos/request/user/delete-user-request.dto.ts
/**
 * DTO para la solicitud de eliminación de usuario
 */
export interface DeleteUserRequestDTO {
    userId: string;
}

/**
 * Validaciones para el DTO de eliminación
 */
export const validateDeleteUserRequest = (dto: DeleteUserRequestDTO): string[] => {
    const errors: string[] = [];

    if (!dto.userId) {
        errors.push('User ID is required');
    }

    if (dto.userId && typeof dto.userId !== 'string') {
        errors.push('User ID must be a string');
    }

    if (dto.userId && dto.userId.trim().length === 0) {
        errors.push('User ID cannot be empty');
    }

    return errors;
};
