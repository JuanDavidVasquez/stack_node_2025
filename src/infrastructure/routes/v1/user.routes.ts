// src/infrastructure/routes/v1/user.routes.ts
import { Router } from 'express';
import { UserController } from '../../../interfaces/http/controllers/user.controller';
import { authMiddleware } from '../../middlewares/validation/auth.middleware';
import { roleMiddleware } from '../../middlewares/role.middleware';
import { UserRole } from '../../../shared/constants/roles';


/**
 * Función para crear las rutas relacionadas con usuarios
 * @param userController Controlador de usuarios inyectado
 * @returns Router con las rutas configuradas
 */
export default function userRoutes(userController: UserController): Router {
  const router = Router();

  router.get('/',
    authMiddleware,
    roleMiddleware(UserRole.ADMIN),
    userController.getUsers);
  router.post('/',
    userController.createUser);
  router.get('/:id',
    authMiddleware,
    roleMiddleware(UserRole.ADMIN),
    userController.getUserById);
  router.put('/:id',
    authMiddleware,
    roleMiddleware(UserRole.ADMIN),
    userController.updateUser);
  router.delete('/:id',
    authMiddleware,
    roleMiddleware(UserRole.ADMIN),
    userController.deleteUser);
  router.patch('/:id/restore',
    authMiddleware,
    roleMiddleware(UserRole.ADMIN),
    userController.restoreUser);

  return router;
}