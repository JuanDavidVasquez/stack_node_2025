// src/infrastructure/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import setupLogger from '../../utils/logger';
import { config } from '../../database/config/env';
import { BcryptAdapter, JwtTokenAdapter } from '../../adaptadores';
import { DatabaseManager } from '../../../database-manager';
import { AuthRepositoryImpl } from '../../repositories/auth.repository.impl';


// Extender la interfaz Request para incluir user
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      role: string;
      firstName: string;
      lastName: string;
      isActive: boolean;
      [key: string]: any;
    }
    interface Request {
      user?: User;
    }
  }
}

const logger = setupLogger({
  ...config.logging,
  dir: `${config.logging.dir}/middlewares`,
});

/**
 * Middleware de autenticación que verifica tokens JWT
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Extraer token del header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        status: 'error',
        message: 'Access token is required'
      });
      return;
    }

    const token = authHeader.substring(7); // Remover 'Bearer '

    if (!token) {
      res.status(401).json({
        status: 'error',
        message: 'Access token is required'
      });
      return;
    }

    // Verificar el token
    const jwtAdapter = new JwtTokenAdapter();
    const payload = await jwtAdapter.verify(token);

    if (!payload.sub) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid token payload'
      });
      return;
    }

    // Obtener información del usuario desde la base de datos
    const databaseManager = DatabaseManager.getInstance();
    const encryptionAdapter = new BcryptAdapter();
    const authRepository = new AuthRepositoryImpl(databaseManager, encryptionAdapter);
    
    const auth = await authRepository.findByUserId(payload.sub);

    if (!auth) {
      res.status(401).json({
        status: 'error',
        message: 'User not found'
      });
      return;
    }

    // Verificar que el usuario esté activo
    if (!auth.isActive) {
      res.status(401).json({
        status: 'error',
        message: 'Account is not active'
      });
      return;
    }

    // Verificar que la cuenta no esté bloqueada
    if (auth.isLocked()) {
      const minutesUntilUnlock = auth.getMinutesUntilUnlock();
      res.status(423).json({
        status: 'error',
        message: `Account is locked. Try again in ${minutesUntilUnlock} minutes.`
      });
      return;
    }

    // Agregar información del usuario al request
    req.user = {
      id: auth.userId,
      email: auth.email,
      role: auth.role,
      firstName: auth.firstName,
      lastName: auth.lastName,
      isActive: auth.isActive
    };

    logger.debug(`User authenticated: ${auth.email}`);
    next();

  } catch (error) {
    logger.error('Error in auth middleware:', error);

    // Manejar errores específicos de JWT
    if (error instanceof Error && 
        (error.message.includes('expired') || 
         error.message.includes('invalid') ||
         error.message.includes('Token'))) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid or expired token'
      });
      return;
    }

    res.status(500).json({
      status: 'error',
      message: 'Authentication failed'
    });
  }
};

/**
 * Middleware de autorización que verifica roles
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Unauthorized access attempt by ${req.user.email} with role ${req.user.role}`);
      res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};

/**
 * Middleware de autenticación opcional (no falla si no hay token)
 */
export const optionalAuthMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No hay token, continuar sin autenticación
      next();
      return;
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      next();
      return;
    }

    // Intentar verificar el token
    const jwtAdapter = new JwtTokenAdapter();
    const payload = await jwtAdapter.verify(token);

    if (payload.sub) {
      const databaseManager = DatabaseManager.getInstance();
      const encryptionAdapter = new BcryptAdapter();
      const authRepository = new AuthRepositoryImpl(databaseManager, encryptionAdapter);
      
      const auth = await authRepository.findByUserId(payload.sub);

      if (auth && auth.isActive && !auth.isLocked()) {
        req.user = {
          id: auth.userId,
          email: auth.email,
          role: auth.role,
          firstName: auth.firstName,
          lastName: auth.lastName,
          isActive: auth.isActive
        };
      }
    }

    next();
  } catch (error) {
    // En caso de error, simplemente continuar sin autenticación
    logger.debug('Optional auth failed, continuing without authentication:', error);
    next();
  }
};