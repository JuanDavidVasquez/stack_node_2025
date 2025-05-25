// src/application/use-cases/user/get-users.use-case.ts
import { UserRepository } from '../../../domain/repositories/user.repository';
import { ApplicationError } from '../../../shared/errors/application.error';
import { validateGetUsersRequest } from '../../dtos/request/user/get-users-request.dto';
import { PaginatedUsersResponseDTO } from '../../dtos/response/user/users-response.dto';
import { UserResponseDTO } from '../../dtos/response/user/user-response.dto';
import { setupLogger } from '../../../infrastructure/utils/logger';
import { config } from '../../../infrastructure/database/config/env';
import { ZodError } from 'zod';

/**
 * Caso de uso para listar usuarios con paginación y filtros
 */
export class GetUsersUseCase {
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/use-cases`,
  });

  constructor(
    private readonly userRepository: UserRepository
  ) {}

  /**
   * Ejecuta el caso de uso para obtener un listado paginado de usuarios
   * @param rawQuery Datos sin validar con filtros y opciones de paginación
   * @returns Lista paginada de usuarios
   */
  async execute(rawQuery: unknown): Promise<PaginatedUsersResponseDTO> {
    try {
      // Validar entrada con Zod
      const queryParams = validateGetUsersRequest(rawQuery);
      
      this.logger.info('Getting users with filters:', queryParams);

      // Obtener usuarios del repositorio utilizando el método findPaginated
      const result = await this.userRepository.findPaginated({
        page: queryParams.page || 1,
        limit: queryParams.limit || 10,
        role: queryParams.role,
        isActive: queryParams.isActive,
        search: queryParams.search,
        orderBy: queryParams.orderBy || 'createdAt',
        orderDirection: queryParams.orderDirection || 'DESC'
      });

      // Mapear entidades de dominio a DTOs de respuesta
      const userDTOs: UserResponseDTO[] = result.data.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));

      // Calcular páginas adicionales
      const hasNextPage = queryParams.page! < result.pages;
      const hasPrevPage = queryParams.page! > 1;

      this.logger.info(`Found ${result.total} users, returning page ${queryParams.page} of ${result.pages}`);

      // Devolver respuesta paginada
      return {
        data: userDTOs,
        total: result.total,
        pages: result.pages,
        currentPage: queryParams.page!,
        limit: queryParams.limit!,
        hasNextPage,
        hasPrevPage
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

      this.logger.error('Error getting users:', error);
      throw new ApplicationError(`Error getting users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}