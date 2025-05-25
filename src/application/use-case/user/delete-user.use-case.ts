// src/application/use-cases/user/delete-user.use-case.ts (Clean Architecture)
import { UserRepository } from '../../../domain/repositories/user.repository';
import { ApplicationError } from '../../../shared/errors/application.error';
import { setupLogger } from '../../../infrastructure/utils/logger';
import { config } from '../../../infrastructure/database/config/env';
import { validateDeleteUserRequest } from '../../dtos/request/user/delete-user-request.dto';
import { DeleteUserResponseDTO } from '../../dtos/response/user/delete-user-response.dto';
import { ZodError } from 'zod';

/**
 * Caso de uso para eliminar un usuario (soft delete)
 */
export class DeleteUserUseCase {
    private readonly logger = setupLogger({
        ...config.logging,
        dir: `${config.logging.dir}/use-cases`,
    });

    constructor(
        private readonly userRepository: UserRepository
    ) {}

    /**
     * Ejecuta el caso de uso
     * @param rawDeleteData Datos sin validar para eliminar el usuario
     * @returns Confirmación de eliminación
     */
    async execute(rawDeleteData: unknown): Promise<DeleteUserResponseDTO> {
        try {
            // Validar entrada con Zod
            const deleteUserDTO = validateDeleteUserRequest(rawDeleteData);
            
            this.logger.info(`Deleting user with ID: ${deleteUserDTO.userId}`);

            // Verificar si el usuario existe
            const existingUser = await this.userRepository.findById(deleteUserDTO.userId);
            if (!existingUser) {
                this.logger.warn(`User with ID ${deleteUserDTO.userId} not found`);
                throw new ApplicationError(`User with ID ${deleteUserDTO.userId} not found`);
            }

            // Verificar si el usuario ya está eliminado (si manejas soft delete con flag)
            if (!existingUser.isActive) {
                this.logger.warn(`User with ID ${deleteUserDTO.userId} is already inactive`);
                throw new ApplicationError(`User with ID ${deleteUserDTO.userId} is already inactive`);
            }

            // Realizar soft delete
            await this.userRepository.delete(deleteUserDTO.userId);

            this.logger.info(`User deleted successfully: ${deleteUserDTO.userId}`);

            // Retornar respuesta DTO
            return {
                id: deleteUserDTO.userId,
                message: 'User deleted successfully',
                deletedAt: new Date()
            };

        } catch (error) {
            if (error instanceof ZodError) {
                const errorMessages = error.errors.map(err => 
                    `${err.path.join('.')}: ${err.message}`
                ).join(', ');
                throw new ApplicationError(`Validation failed: ${errorMessages}`);
            }
            
            if (error instanceof ApplicationError) {
                throw error;
            }

            this.logger.error(`Error deleting user with ID:`, error);
            throw new ApplicationError(`Error deleting user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}