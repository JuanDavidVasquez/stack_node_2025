// src/infrastructure/middlewares/ownership.middleware.ts
import { Request, Response, NextFunction } from 'express';
import setupLogger from '../utils/logger';
import { config } from '../database/config/env';
import { DatabaseManager } from '../../database-manager';


const logger = setupLogger({
  ...config.logging,
  dir: `${config.logging.dir}/middlewares`,
});

/**
 * Interface para la configuración del middleware de propiedad
 */
interface OwnershipConfig {
  /** Nombre de la tabla en la base de datos */
  tableName: string;
  /** Campo que contiene el ID del propietario (por defecto 'userId') */
  ownerField?: string;
  /** Campo que contiene el ID del recurso (por defecto 'id') */
  resourceIdField?: string;
  /** Función para extraer el ID del recurso de la request */
  getResourceId: (req: Request) => string;
  /** Mensaje de error personalizado */
  errorMessage?: string;
  /** Permite a los admins acceder a cualquier recurso */
  allowAdmin?: boolean;
  /** Roles adicionales que pueden acceder a cualquier recurso */
  allowedRoles?: string[];
}

/**
 * Middleware de validación de propiedad
 * Verifica que el usuario autenticado sea el propietario del recurso que intenta modificar
 * 
 * @param config - Configuración del middleware
 * @returns Middleware function
 * 
 * @example
 * // Para validar que el usuario pueda editar su propio perfil
 * const validateProfileOwnership = ownershipMiddleware({
 *   tableName: 'users',
 *   getResourceId: (req) => req.params.userId,
 *   errorMessage: 'You can only edit your own profile'
 * });
 * 
 * router.put('/users/:userId/profile', 
 *   authMiddleware, 
 *   validateProfileOwnership, 
 *   controller.updateProfile
 * );
 */
export const ownershipMiddleware = (config: OwnershipConfig) => {
  const {
    tableName,
    ownerField = 'userId',
    resourceIdField = 'id',
    getResourceId,
    errorMessage = 'You can only access your own resources',
    allowAdmin = true,
    allowedRoles = []
  } = config;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Verificar autenticación
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      // Si es admin y está permitido, continuar
      if (allowAdmin && req.user.role === 'admin') {
        logger.debug(`Admin ${req.user.email} accessing resource in ${tableName}`);
        next();
        return;
      }

      // Si tiene un rol especial permitido, continuar
      if (allowedRoles.length > 0 && allowedRoles.includes(req.user.role)) {
        logger.debug(`User ${req.user.email} with special role ${req.user.role} accessing resource in ${tableName}`);
        next();
        return;
      }

      // Obtener el ID del recurso
      const resourceId = getResourceId(req);
      
      if (!resourceId) {
        res.status(400).json({
          status: 'error',
          message: 'Resource ID is required'
        });
        return;
      }

      // Consultar la base de datos para verificar propiedad
      const databaseManager = DatabaseManager.getInstance();
      const connection = databaseManager.getConnection();
      const query = `SELECT ${ownerField} FROM ${tableName} WHERE ${resourceIdField} = ?`;
      
      logger.debug(`Checking ownership: ${query} with resourceId: ${resourceId}`);
      
      const result = await connection.query(query, [resourceId]);

      if (!result || result.length === 0) {
        res.status(404).json({
          status: 'error',
          message: 'Resource not found'
        });
        return;
      }

      const resource = result[0];
      const resourceOwnerId = resource[ownerField];

      // Verificar que el usuario sea el propietario
      if (resourceOwnerId !== req.user.id) {
        logger.warn(
          `Ownership violation: User ${req.user.email} (${req.user.id}) tried to access resource ${resourceId} owned by ${resourceOwnerId} in table ${tableName}`
        );
        
        res.status(403).json({
          status: 'error',
          message: errorMessage,
          details: {
            userId: req.user.id,
            resourceId: resourceId,
            table: tableName
          }
        });
        return;
      }

      logger.debug(`Ownership verified: User ${req.user.email} owns resource ${resourceId} in ${tableName}`);
      next();

    } catch (error) {
      logger.error('Error in ownership middleware:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to verify resource ownership'
      });
    }
  };
};

/**
 * Middleware específico para validar propiedad de perfil de usuario
 */
export const validateProfileOwnership = ownershipMiddleware({
  tableName: 'users',
  resourceIdField: 'id',
  getResourceId: (req) => req.params.userId || req.params.id,
  errorMessage: 'You can only edit your own profile'
});

/**
 * Middleware específico para validar propiedad de mascotas en veterinaria
 */
export const validatePetOwnership = ownershipMiddleware({
  tableName: 'pets',
  ownerField: 'ownerId', // Asumiendo que las mascotas tienen un campo 'ownerId'
  getResourceId: (req) => req.params.petId || req.params.id,
  errorMessage: 'You can only access your own pets',
  allowedRoles: ['veterinarian', 'admin'] // Los veterinarios pueden ver todas las mascotas
});

/**
 * Middleware específico para validar propiedad de citas médicas
 */
export const validateAppointmentOwnership = ownershipMiddleware({
  tableName: 'appointments',
  ownerField: 'clientId', // Asumiendo que las citas tienen un campo 'clientId'
  getResourceId: (req) => req.params.appointmentId || req.params.id,
  errorMessage: 'You can only access your own appointments',
  allowedRoles: ['veterinarian', 'admin'] // Los veterinarios pueden ver todas las citas
});

/**
 * Middleware específico para validar propiedad de historiales médicos
 */
export const validateMedicalRecordOwnership = ownershipMiddleware({
  tableName: 'medical_records',
  ownerField: 'clientId', // A través de la mascota
  getResourceId: (req) => req.params.recordId || req.params.id,
  errorMessage: 'You can only access medical records of your own pets',
  allowedRoles: ['veterinarian', 'admin']
});

/**
 * Middleware para validar propiedad a través de una relación (JOIN)
 * Útil cuando necesitas verificar propiedad a través de múltiples tablas
 * 
 * @example
 * // Para verificar que un usuario pueda acceder a los historiales médicos de sus mascotas
 * const validatePetMedicalRecordOwnership = relationshipOwnershipMiddleware({
 *   query: `
 *     SELECT p.ownerId 
 *     FROM medical_records mr 
 *     JOIN pets p ON mr.petId = p.id 
 *     WHERE mr.id = ?
 *   `,
 *   getResourceId: (req) => req.params.recordId,
 *   errorMessage: 'You can only access medical records of your own pets'
 * });
 */
export const relationshipOwnershipMiddleware = (config: {
  query: string;
  getResourceId: (req: Request) => string;
  errorMessage?: string;
  allowAdmin?: boolean;
  allowedRoles?: string[];
}) => {
  const {
    query,
    getResourceId,
    errorMessage = 'You can only access your own resources',
    allowAdmin = true,
    allowedRoles = []
  } = config;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      // Si es admin y está permitido, continuar
      if (allowAdmin && req.user.role === 'admin') {
        next();
        return;
      }

      // Si tiene un rol especial permitido, continuar
      if (allowedRoles.length > 0 && allowedRoles.includes(req.user.role)) {
        next();
        return;
      }

      const resourceId = getResourceId(req);
      
      if (!resourceId) {
        res.status(400).json({
          status: 'error',
          message: 'Resource ID is required'
        });
        return;
      }

      const databaseManager = DatabaseManager.getInstance();
      const connection = databaseManager.getConnection();
      const result = await connection.query(query, [resourceId]);

      if (!result || result.length === 0) {
        res.status(404).json({
          status: 'error',
          message: 'Resource not found'
        });
        return;
      }

      // Asumimos que la query devuelve el ownerId en la primera columna
      const ownerIdKey = Object.keys(result[0])[0];
      const resourceOwnerId = result[0][ownerIdKey];

      if (resourceOwnerId !== req.user.id) {
        logger.warn(
          `Relationship ownership violation: User ${req.user.email} (${req.user.id}) tried to access resource ${resourceId} owned by ${resourceOwnerId}`
        );
        
        res.status(403).json({
          status: 'error',
          message: errorMessage
        });
        return;
      }

      next();

    } catch (error) {
      logger.error('Error in relationship ownership middleware:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to verify resource ownership'
      });
    }
  };
};

/**
 * Middleware que permite múltiples tipos de propiedad
 * Útil para casos donde el mismo endpoint puede ser accedido por diferentes tipos de usuarios
 * 
 * @example
 * // Un veterinario puede acceder si es el veterinario asignado, o un cliente si es su mascota
 * const validatePetAccess = multiOwnershipMiddleware([
 *   {
 *     condition: (user) => user.role === 'client',
 *     validation: validatePetOwnership
 *   },
 *   {
 *     condition: (user) => user.role === 'veterinarian',
 *     validation: relationshipOwnershipMiddleware({
 *       query: 'SELECT veterinarianId as ownerId FROM pets WHERE id = ?',
 *       getResourceId: (req) => req.params.petId
 *     })
 *   }
 * ]);
 */
export const multiOwnershipMiddleware = (validations: Array<{
  condition: (user: Express.User) => boolean;
  validation: (req: Request, res: Response, next: NextFunction) => void;
}>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
      return;
    }

    // Si es admin, siempre permitir
    if (req.user.role === 'admin') {
      next();
      return;
    }

    // Encontrar la validación apropiada para este usuario
    const applicableValidation = validations.find(v => v.condition(req.user!));

    if (!applicableValidation) {
      res.status(403).json({
        status: 'error',
        message: 'You do not have permission to access this resource'
      });
      return;
    }

    // Ejecutar la validación específica
    applicableValidation.validation(req, res, next);
  };
};