// src/application/dtos/request/user/update-user-request.dto.ts
import { UserRole } from "../../../../shared/constants/roles";

/**
 * DTO para la solicitud de actualización de usuario
 * Todos los campos son opcionales para permitir actualizaciones parciales
 */
export interface UpdateUserRequestDTO {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    role?: UserRole;
    isActive?: boolean;
}

/**
 * Validaciones opcionales para el DTO (puedes usar class-validator si prefieres)
 */
export const validateUpdateUserRequest = (dto: UpdateUserRequestDTO): string[] => {
    const errors: string[] = [];

    if (dto.email !== undefined) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(dto.email)) {
            errors.push('Invalid email format');
        }
    }

    if (dto.password !== undefined) {
        if (dto.password.length < 6) {
            errors.push('Password must be at least 6 characters long');
        }
    }

    if (dto.firstName !== undefined) {
        if (dto.firstName.trim().length === 0) {
            errors.push('First name cannot be empty');
        }
    }

    if (dto.lastName !== undefined) {
        if (dto.lastName.trim().length === 0) {
            errors.push('Last name cannot be empty');
        }
    }

    return errors;
};