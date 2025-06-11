import { Router } from 'express';
import { UserController } from '../../../interfaces/http/controllers/user.controller';
import userRoutes from './user.routes';
import { EmailVerificationController } from '../../../interfaces/http/controllers/email-verification.controller';
import emailVerificationRoutes from './email-verification.routes';
import authRoutes from './auth.routes';
import { AuthController } from '../../../interfaces/http/controllers/auth.controller';

// Define or import the Controllers type
type Controllers = {
  userController: UserController;
  authController: AuthController;
  emailVerificationController: EmailVerificationController;
};

export default function v1Router(controllers: Controllers): Router {
  const router = Router();

  // Montar las rutas de la versión 1 de la API
  router.use('/users', userRoutes(controllers.userController));
  router.use('/auth', authRoutes(controllers.authController));
  router.use('/email-verification', emailVerificationRoutes(controllers.emailVerificationController));

  return router;
}