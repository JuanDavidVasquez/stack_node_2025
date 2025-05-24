// src/application/use-cases/user/update-user.use-case.ts (Clean Architecture)
import { User } from "../../../domain/entities/user.entity";
import { UserRepository } from "../../../domain/repositories/user.repository";
import { EncryptionAdapter, UuidAdapter } from "../../../infrastructure/adaptadores";
import { config } from "../../../infrastructure/database/config/env";
import { setupLogger } from "../../../infrastructure/utils/logger";
import { ApplicationError } from "../../../shared/errors/application.error";
import { UpdateUserRequestDTO } from "../../dtos/request/user/update-user-request.dto";
import { UpdateUserResponseDTO } from "../../dtos/response/user/user-response.dto";

/**
 * Caso de uso para actualizar un usuario existente
 */
export class UpdateUserUseCase {
    private readonly logger = setupLogger({
        ...config.logging,
        dir: `${config.logging.dir}/use-cases`,
    });

    constructor(
        private readonly userRepository: UserRepository,
        private readonly encryptionAdapter: EncryptionAdapter,
        private readonly uuidAdapter: UuidAdapter
    ) {}

    /**
     * Ejecuta el caso de uso
     * @param userId ID del usuario a actualizar
     * @param updateUserDTO Datos para actualizar el usuario
     * @returns Datos del usuario actualizado
     */
    async execute(userId: string, updateUserDTO: UpdateUserRequestDTO): Promise<UpdateUserResponseDTO> {
        try {
            this.logger.info(`Updating user with ID: ${userId}`);

            // Verificar si el usuario existe
            const existingUser = await this.userRepository.findById(userId);
            if (!existingUser) {
                this.logger.warn(`User with ID ${userId} not found`);
                throw new ApplicationError(`User with ID ${userId} not found`);
            }

            // Si se está actualizando el email, verificar que no esté en uso por otro usuario
            if (updateUserDTO.email && updateUserDTO.email !== existingUser.email) {
                const userWithSameEmail = await this.userRepository.findByEmail(updateUserDTO.email);
                if (userWithSameEmail && userWithSameEmail.id !== userId) {
                    this.logger.warn(`Email ${updateUserDTO.email} is already in use by another user`);
                    throw new ApplicationError(`Email ${updateUserDTO.email} is already in use`);
                }
            }

            // Crear el objeto User actualizado manteniendo los datos existentes
            let hashedPassword = existingUser.password;
            
            // Encriptar la nueva contraseña si se proporciona
            if (updateUserDTO.password) {
                this.logger.info(`Updating password for user: ${userId}`);
                hashedPassword = await this.encryptionAdapter.hash(updateUserDTO.password);
            }

            // Crear la entidad User actualizada
            const updatedUserEntity = new User({
                id: existingUser.id,
                email: updateUserDTO.email ?? existingUser.email,
                password: hashedPassword,
                firstName: updateUserDTO.firstName ?? existingUser.firstName,
                lastName: updateUserDTO.lastName ?? existingUser.lastName,
                role: updateUserDTO.role ?? existingUser.role,
                isActive: updateUserDTO.isActive ?? existingUser.isActive,
                verificationCode: existingUser.verificationCode,
                createdAt: existingUser.createdAt,
                updatedAt: new Date()
            });

            // Actualizar el usuario
            const updatedUser = await this.userRepository.update(updatedUserEntity);
            
            if (!updatedUser) {
                this.logger.error(`Failed to update user with ID: ${userId}`);
                throw new ApplicationError(`Failed to update user with ID: ${userId}`);
            }

            this.logger.info(`User updated successfully: ${updatedUser.id}`);

            // Retornar respuesta DTO
            return {
                id: updatedUser.id,
                email: updatedUser.email,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                role: updatedUser.role,
                isActive: updatedUser.isActive,
                createdAt: updatedUser.createdAt,
                updatedAt: updatedUser.updatedAt,
                verificationCode: updatedUser.verificationCode || undefined
            };

        } catch (error) {
            if (error instanceof ApplicationError) {
                throw error;
            }

            this.logger.error(`Error updating user with ID ${userId}:`, error);
            throw new ApplicationError(`Error updating user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}