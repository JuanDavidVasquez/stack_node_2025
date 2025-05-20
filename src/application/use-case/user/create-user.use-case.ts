// src/application/use-cases/user/create-user.use-case.ts (Clean Architecture)
import { User } from '../../../domain/entities/user.entity';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { ApplicationError } from '../../../shared/errors/application.error';
import { setupLogger } from '../../../infrastructure/utils/logger';
import { config } from '../../../infrastructure/database/config/env';
import { CreateUserRequestDTO } from '../../dtos/request/user/create-user-request.dto';
import { CreateUserResponseDTO } from '../../dtos/response/user/user-response.dto';
import { EncryptionAdapter, UuidAdapter } from '../../../infrastructure/adaptadores';
import { UserRole } from '../../../shared/constants/roles';

/**
 * Caso de uso para crear un nuevo usuario
 */
export class CreateUserUseCase {
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
   * @param createUserDTO Datos para crear el usuario
   * @returns Datos del usuario creado
   */
  async execute(createUserDTO: CreateUserRequestDTO): Promise<CreateUserResponseDTO> {
    try {
      this.logger.info(`Creating new user with email: ${createUserDTO.email}`);

      // Verificar si el usuario ya existe
      const existingUser = await this.userRepository.findByEmail(createUserDTO.email);
      if (existingUser) {
        this.logger.warn(`User with email ${createUserDTO.email} already exists`);
        throw new ApplicationError(`User with email ${createUserDTO.email} already exists`);
      }

      // Generar un ID único
      const userId = this.uuidAdapter.generate();

      // Encriptar la contraseña
      const hashedPassword = await this.encryptionAdapter.hash(createUserDTO.password);

      // Generar código de verificación (podría ser otro adaptador de token/random)
      const verificationCode = this.uuidAdapter.generate();

      // Crear entidad de usuario
      const user = new User({
        id: userId,
        email: createUserDTO.email,
        password: hashedPassword,
        firstName: createUserDTO.firstName,
        lastName: createUserDTO.lastName,
        role: createUserDTO.role || UserRole.USER,
        isActive: false,
        verificationCode,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Guardar el usuario
      const savedUser = await this.userRepository.save(user);

      this.logger.info(`User created successfully: ${savedUser.id}`);

      // Retornar respuesta DTO
      return {
        id: savedUser.id,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        role: savedUser.role,
        isActive: savedUser.isActive,
        createdAt: savedUser.createdAt,
        updatedAt: savedUser.updatedAt,
        verificationCode: savedUser.verificationCode || undefined
      };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      this.logger.error('Error creating user:', error);
      throw new ApplicationError(`Error creating user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}