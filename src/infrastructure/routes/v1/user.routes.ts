// src/infrastructure/routes/v1/user.routes.ts
import { Router } from 'express';
import { UserController } from '../../../interfaces/http/controllers/user.controller';


/**
 * Función para crear las rutas relacionadas con usuarios
 * @param userController Controlador de usuarios inyectado
 * @returns Router con las rutas configuradas
 */
export default function userRoutes(userController: UserController): Router {
  const router = Router();

  router.get('/', userController.getUsers);
  router.post('/', userController.createUser);
  router.get('/:id', userController.getUserById);

  
  return router;
}