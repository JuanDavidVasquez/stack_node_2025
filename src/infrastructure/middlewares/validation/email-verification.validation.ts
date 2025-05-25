// src/infrastructure/middlewares/validation/email-verification.validation.ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Schemas de validación
const sendCodeSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .trim()
    .toLowerCase()
});

const verifyCodeSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .trim()
    .toLowerCase(),
  code: z.string()
    .min(6, 'Verification code must be 6 digits')
    .max(6, 'Verification code must be 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only numbers')
});

const resendCodeSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .trim()
    .toLowerCase()
});

// Middleware de validación genérico
const validateSchema = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        
        res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errorMessages
        });
        return;
      }
      
      res.status(500).json({
        status: 'error',
        message: 'Internal validation error'
      });
    }
  };
};

// Exportar validaciones
export const validateEmailVerification = {
  sendCode: validateSchema(sendCodeSchema),
  verifyCode: validateSchema(verifyCodeSchema),
  resendCode: validateSchema(resendCodeSchema)
};
