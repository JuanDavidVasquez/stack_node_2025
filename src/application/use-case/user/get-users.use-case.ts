// src/application/use-cases/user/get-users.use-case.ts
import { UserRepository } from '../../../domain/repositories/user.repository';
import { ApplicationError } from '../../../shared/errors/application.error';
import { GetUsersRequestDTO } from '../../dtos/request/user/get-users-request.dto';
import { PaginatedUsersResponseDTO } from '../../dtos/response/user/users-response.dto';
import { UserResponseDTO } from '../../dtos/response/user/user-response.dto';
import { setupLogger } from '../../../infrastructure/utils/logger';
import { config } from '../../../infrastructure/database/config/env';

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
   * @param requestDTO DTO con filtros y opciones de paginación
   * @returns Lista paginada de usuarios
   */
  async execute(requestDTO: GetUsersRequestDTO): Promise<PaginatedUsersResponseDTO> {
    try {
      this.logger.info('Getting users with filters:', requestDTO);

      // Valores por defecto para paginación
      const page = requestDTO.page || 1;
      const limit = requestDTO.limit || 10;

      // Validar parámetros de paginación
      if (page < 1) {
        throw new ApplicationError('Page must be greater than or equal to 1');
      }

      if (limit < 1 || limit > 100) {
        throw new ApplicationError('Limit must be between 1 and 100');
      }

      // Obtener usuarios del repositorio utilizando el método findPaginated
      const result = await this.userRepository.findPaginated({
        page,
        limit,
        role: requestDTO.role,
        isActive: requestDTO.isActive,
        search: requestDTO.search,
        orderBy: this.validateOrderBy(requestDTO.orderBy),
        orderDirection: requestDTO.orderDirection || 'DESC'
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
      const hasNextPage = page < result.pages;
      const hasPrevPage = page > 1;

      this.logger.info(`Found ${result.total} users, returning page ${page} of ${result.pages}`);

      // Devolver respuesta paginada
      return {
        data: userDTOs,
        total: result.total,
        pages: result.pages,
        currentPage: page,
        limit,
        hasNextPage,
        hasPrevPage
      };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      this.logger.error('Error getting users:', error);
      throw new ApplicationError(`Error getting users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Valida y sanitiza el campo de ordenamiento para prevenir inyección SQL
   * @param orderBy Campo de ordenamiento solicitado
   * @returns Campo de ordenamiento validado o valor por defecto
   */
  private validateOrderBy(orderBy?: string): string {
    // Lista de campos permitidos para ordenar
    const allowedFields = ['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'createdAt', 'updatedAt'];
    
    // Si no se proporciona un campo o no está en la lista de permitidos, usar el valor por defecto
    if (!orderBy || !allowedFields.includes(orderBy)) {
      return 'createdAt';
    }
    
    return orderBy;
  }
}