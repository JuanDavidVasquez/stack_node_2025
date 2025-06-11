// src/infrastructure/routes/v1/auth.routes.ts
import { Router } from 'express';
import { AuthController } from '../../../interfaces/http/controllers/auth.controller';
import { validateAuth } from '../../middlewares/validation/auth.validation';
import { authMiddleware } from '../../middlewares/validation/auth.middleware';
import { validateProfileOwnership } from '../../middlewares/ownership.middleware';


/**
 * Función para crear las rutas de autenticación
 */
export default function authRoutes(controller: AuthController): Router {
  const router = Router();

  // POST /api/v1/auth/login
  router.post('/login', 
    validateAuth.login,
    controller.login
  );

  // POST /api/v1/auth/refresh
  router.post('/refresh', 
    validateAuth.refreshToken,
    controller.refreshToken
  );

  // POST /api/v1/auth/logout
  router.post('/logout', 
    controller.logout
  );

  // POST /api/v1/auth/verify
  router.post('/verify', 
    validateAuth.verifyToken,
    controller.verifyToken
  );

  // GET /api/v1/auth/me
  router.get('/me', 
    authMiddleware,
    validateProfileOwnership,
    controller.me
  );

  return router;
}