// src/infrastructure/middlewares/role.middleware.ts
import { Request, Response, NextFunction } from 'express';
import setupLogger from '../utils/logger';
import { config } from '../database/config/env';


const logger = setupLogger({
  ...config.logging,
  dir: `${config.logging.dir}/middlewares`,
});

/**
 * Middleware de autorización por roles
 * Verifica que el usuario autenticado tenga uno de los roles permitidos
 * 
 * @param allowedRoles - Array de roles permitidos o un solo rol
 * @returns Middleware function
 * 
 * @example
 * // Para un solo rol
 * router.get('/admin-only', authMiddleware, roleMiddleware('admin'), controller.method);
 * 
 * // Para múltiples roles
 * router.get('/admin-user', authMiddleware, roleMiddleware(['admin', 'user']), controller.method);
 * 
 * // También funciona con sintaxis spread
 * router.get('/multi-role', authMiddleware, roleMiddleware('admin', 'moderator', 'user'), controller.method);
 */
export const roleMiddleware = (...allowedRoles: (string | string[])[]) => {
  // Aplanar el array para manejar tanto strings individuales como arrays
  const normalizedRoles = allowedRoles.flat();
  
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Verificar que existe información del usuario (debe haberse ejecutado authMiddleware antes)
      if (!req.user) {
        logger.warn('Role middleware called without authenticated user');
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      // Verificar que el usuario tenga un rol asignado
      if (!req.user.role) {
        logger.warn(`User ${req.user.email} has no role assigned`);
        res.status(403).json({
          status: 'error',
          message: 'No role assigned to user'
        });
        return;
      }

      // Verificar que el rol del usuario esté en la lista de roles permitidos
      if (!normalizedRoles.includes(req.user.role)) {
        logger.warn(
          `Unauthorized access attempt by ${req.user.email} with role '${req.user.role}'. Required roles: [${normalizedRoles.join(', ')}]`
        );
        res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions',
          details: {
            userRole: req.user.role,
            requiredRoles: normalizedRoles
          }
        });
        return;
      }

      // Usuario autorizado, continuar
      logger.debug(`User ${req.user.email} authorized with role '${req.user.role}'`);
      next();

    } catch (error) {
      logger.error('Error in role middleware:', error);
      res.status(500).json({
        status: 'error',
        message: 'Authorization check failed'
      });
    }
  };
};

/**
 * Middleware de autorización para solo administradores
 * Shortcut para roleMiddleware('admin')
 */
export const adminOnly = roleMiddleware('admin');

/**
 * Middleware de autorización para administradores y moderadores
 * Shortcut para roleMiddleware(['admin', 'moderator'])
 */
export const adminOrModerator = roleMiddleware('admin', 'moderator');

/**
 * Middleware de autorización para usuarios autenticados (cualquier rol)
 * Útil cuando solo importa que esté autenticado, no el rol específico
 */
export const anyRole = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      status: 'error',
      message: 'Authentication required'
    });
    return;
  }
  next();
};

/**
 * Middleware que permite acceso si el usuario es el propietario del recurso o tiene rol de admin
 * 
 * @param getResourceUserId - Función que extrae el ID del usuario propietario del recurso
 * @returns Middleware function
 * 
 * @example
 * // Para rutas con parámetro userId
 * const checkOwnership = ownerOrAdmin((req) => req.params.userId);
 * router.get('/users/:userId/profile', authMiddleware, checkOwnership, controller.getProfile);
 */
export const ownerOrAdmin = (getResourceUserId: (req: Request) => string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      const resourceUserId = getResourceUserId(req);
      const isOwner = req.user.id === resourceUserId;
      const isAdmin = req.user.role === 'admin';

      if (!isOwner && !isAdmin) {
        logger.warn(
          `User ${req.user.email} tried to access resource owned by ${resourceUserId}`
        );
        res.status(403).json({
          status: 'error',
          message: 'Access denied. You can only access your own resources or be an admin.'
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Error in owner or admin middleware:', error);
      res.status(500).json({
        status: 'error',
        message: 'Authorization check failed'
      });
    }
  };
};