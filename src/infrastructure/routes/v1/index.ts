import { Router } from 'express';
import { UserController } from '../../../interfaces/http/controllers/user.controller';
import userRoutes from './user.routes';

// Define or import the Controllers type
type Controllers = {
  userController: UserController;

};

export default function v1Router(controllers: Controllers): Router {
  const router = Router();

  // Montar las rutas de la versión 1 de la API
  router.use('/users', userRoutes(controllers.userController));

  return router;
}