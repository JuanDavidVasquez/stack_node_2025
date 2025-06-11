// src/infrastructure/middlewares/validation/auth.validation.ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Schemas de validación para auth
const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .trim()
    .toLowerCase(),
  password: z.string()
    .min(1, 'Password is required')
    .max(100, 'Password must be less than 100 characters'),
  rememberMe: z.boolean()
    .optional()
    .default(false)
});

const refreshTokenSchema = z.object({
  refreshToken: z.string()
    .min(1, 'Refresh token is required')
});

const verifyTokenSchema = z.object({
  token: z.string()
    .min(1, 'Token is required')
});

const changePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, 'Current password is required'),
  newPassword: z.string()
    .min(6, 'New password must be at least 6 characters')
    .max(100, 'New password must be less than 100 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string()
    .min(1, 'Password confirmation is required')
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

const forgotPasswordSchema = z.object({
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

// Validación especial para verify token que puede venir del header
const validateVerifyToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // El token puede venir del body o del header Authorization
    const authHeader = req.headers.authorization;
    const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    const tokenFromBody = req.body.token;
    
    const token = tokenFromHeader || tokenFromBody;
    
    if (!token) {
      res.status(400).json({
        status: 'error',
        message: 'Token is required (in body or Authorization header)'
      });
      return;
    }
    
    // Si el token vino del header, agregarlo al body para consistencia
    if (tokenFromHeader && !tokenFromBody) {
      req.body.token = tokenFromHeader;
    }
    
    const validatedData = verifyTokenSchema.parse(req.body);
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

// Validación especial para refresh token que puede venir de cookies
const validateRefreshToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // El refresh token puede venir del body o de las cookies
    const refreshTokenFromBody = req.body.refreshToken;
    const refreshTokenFromCookie = req.cookies?.refreshToken;
    
    const refreshToken = refreshTokenFromBody || refreshTokenFromCookie;
    
    if (!refreshToken) {
      res.status(400).json({
        status: 'error',
        message: 'Refresh token is required (in body or cookies)'
      });
      return;
    }
    
    // Asegurar que el token esté en el body
    req.body.refreshToken = refreshToken;
    
    const validatedData = refreshTokenSchema.parse(req.body);
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

// Exportar validaciones
export const validateAuth = {
  login: validateSchema(loginSchema),
  refreshToken: validateRefreshToken,
  verifyToken: validateVerifyToken,
  changePassword: validateSchema(changePasswordSchema),
  forgotPassword: validateSchema(forgotPasswordSchema)
};