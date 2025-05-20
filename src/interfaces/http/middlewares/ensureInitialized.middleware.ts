// src/infrastructure/middlewares/ensure-initialized.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ControllerService } from '../../../infrastructure/services/controller.service';

// Extiende la interfaz Request para incluir 'controllers'
declare module 'express-serve-static-core' {
  interface Request {
    controllers?: {
      userController: ReturnType<typeof ControllerService.prototype.getUserController>;
      // Agrega más controladores aquí si es necesario
    };
  }
}


/**
 * Middleware para verificar que el controllerService esté inicializado
 * y adjuntar controladores necesarios a la solicitud
 */
export const ensureInitialized = (req: Request, res: Response, next: NextFunction): void => {
  const controllerService = ControllerService.getInstance();
  
  if (!controllerService.isInitialized()) {
    res.status(503).json({
      status: 'error',
      message: 'Service unavailable: System initializing, please try again later'
    });
    return;
  }
  
  // Adjuntar los controladores necesarios a la solicitud
  req.controllers = {
    userController: controllerService.getUserController()
    // Puedes agregar más controladores aquí a medida que los necesites
  };
  
  next();
};