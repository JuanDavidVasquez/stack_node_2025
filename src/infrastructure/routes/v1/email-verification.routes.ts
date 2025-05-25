// src/infrastructure/routes/v1/email-verification.routes.ts
import { Router } from 'express';
import { EmailVerificationController } from '../../../interfaces/http/controllers/email-verification.controller';
import { validateEmailVerification } from '../../middlewares/validation/email-verification.validation';


/**
 * Función para crear las rutas de verificación de email
 */
export default function emailVerificationRoutes(controller: EmailVerificationController): Router {
  const router = Router();

  // POST /api/v1/email-verification/send
  router.post('/send', 
    validateEmailVerification.sendCode,
    controller.sendVerificationCode
  );

  // POST /api/v1/email-verification/verify
  router.post('/verify', 
    validateEmailVerification.verifyCode,
    controller.verifyCode
  );

  // POST /api/v1/email-verification/resend
  router.post('/resend', 
    validateEmailVerification.resendCode,
    controller.resendVerificationCode
  );

  return router;
}