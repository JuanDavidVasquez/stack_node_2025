// src/application/schemas/user/user.schemas.ts
import { z } from 'zod';
import { UserRole } from '../../shared/constants/roles';

/**
 * Schema base para validaciones comunes de usuario
 */
const baseUserValidations = {
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .trim()
    .toLowerCase(),
  
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .trim()
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'First name can only contain letters and spaces'),
  
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .trim()
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Last name can only contain letters and spaces'),
  
  role: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: `Role must be one of: ${Object.values(UserRole).join(', ')}` })
  }),

  userId: z.string()
    .min(1, 'User ID is required')
    .uuid('Invalid user ID format'),

  isActive: z.boolean({
    errorMap: () => ({ message: 'isActive must be a boolean value' })
  })
};

/**
 * Schema para crear usuario
 */
export const CreateUserSchema = z.object({
  email: baseUserValidations.email,
  password: baseUserValidations.password,
  firstName: baseUserValidations.firstName,
  lastName: baseUserValidations.lastName,
  role: baseUserValidations.role.optional().default(UserRole.USER)
}).strict(); // No permite campos adicionales

/**
 * Schema para actualizar usuario (todos los campos opcionales)
 */
export const UpdateUserSchema = z.object({
  email: baseUserValidations.email.optional(),
  password: baseUserValidations.password.optional(),
  firstName: baseUserValidations.firstName.optional(),
  lastName: baseUserValidations.lastName.optional(),
  role: baseUserValidations.role.optional(),
  isActive: baseUserValidations.isActive.optional()
}).strict()
.refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

/**
 * Schema para validar ID de usuario en parámetros
 */
export const UserIdParamSchema = z.object({
  id: baseUserValidations.userId
});

/**
 * Schema para eliminar usuario
 */
export const DeleteUserSchema = z.object({
  userId: baseUserValidations.userId
});

/**
 * Schema para consultas de usuario (query parameters)
 */
export const GetUsersQuerySchema = z.object({
  page: z.string()
    .optional()
    .transform(val => val ? parseInt(val, 10) : 1)
    .refine(val => val > 0, 'Page must be a positive number'),
  
  limit: z.string()
    .optional()
    .transform(val => val ? parseInt(val, 10) : 10)
    .refine(val => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
  
  search: z.string()
    .optional()
    .transform(val => val?.trim())
    .refine(val => !val || val.length >= 2, 'Search term must be at least 2 characters'),
  
  role: baseUserValidations.role.optional(),
  
  isActive: z.string()
    .optional()
    .transform(val => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    })
    .optional(),

  orderBy: z.string()
    .optional()
    .refine(val => !val || ['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'createdAt', 'updatedAt'].includes(val), {
      message: 'orderBy must be one of: id, email, firstName, lastName, role, isActive, createdAt, updatedAt'
    })
    .transform(val => val || 'createdAt'), // Default value
  
  orderDirection: z.string()
    .optional()
    .refine(val => !val || ['ASC', 'DESC', 'asc', 'desc'].includes(val), {
      message: 'orderDirection must be ASC or DESC'
    })
    .transform(val => val ? val.toUpperCase() as 'ASC' | 'DESC' : 'DESC') // Default value and normalize case
});

// Tipos derivados de los schemas para usar en los DTOs
export type CreateUserSchemaType = z.infer<typeof CreateUserSchema>;
export type UpdateUserSchemaType = z.infer<typeof UpdateUserSchema>;
export type UserIdParamSchemaType = z.infer<typeof UserIdParamSchema>;
export type DeleteUserSchemaType = z.infer<typeof DeleteUserSchema>;
export type GetUsersQuerySchemaType = z.infer<typeof GetUsersQuerySchema>;

/**
 * Función helper para validar y transformar datos
 */
export const validateUserData = {
  createUser: (data: unknown) => CreateUserSchema.parse(data),
  updateUser: (data: unknown) => UpdateUserSchema.parse(data),
  userIdParam: (data: unknown) => UserIdParamSchema.parse(data),
  deleteUser: (data: unknown) => DeleteUserSchema.parse(data),
  getUsersQuery: (data: unknown) => GetUsersQuerySchema.parse(data)
};

/**
 * Función helper para validación segura (retorna resultado en lugar de lanzar error)
 */
export const safeValidateUserData = {
  createUser: (data: unknown) => CreateUserSchema.safeParse(data),
  updateUser: (data: unknown) => UpdateUserSchema.safeParse(data),
  userIdParam: (data: unknown) => UserIdParamSchema.safeParse(data),
  deleteUser: (data: unknown) => DeleteUserSchema.safeParse(data),
  getUsersQuery: (data: unknown) => GetUsersQuerySchema.safeParse(data)
};