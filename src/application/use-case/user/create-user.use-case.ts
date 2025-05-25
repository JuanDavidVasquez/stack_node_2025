// src/application/use-cases/user/create-user.use-case.ts (Updated with Email)
import { User } from '../../../domain/entities/user.entity';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { ApplicationError } from '../../../shared/errors/application.error';
import { setupLogger } from '../../../infrastructure/utils/logger';
import { config } from '../../../infrastructure/database/config/env';
import { validateCreateUserRequest } from '../../dtos/request/user/create-user-request.dto';
import { CreateUserResponseDTO } from '../../dtos/response/user/user-response.dto';
import { EncryptionAdapter, UuidAdapter } from '../../../infrastructure/adaptadores';
import { EmailService } from '../../../infrastructure/services/email.service';
import { UserRole } from '../../../shared/constants/roles';
import { ZodError } from 'zod';

/**
 * Caso de uso para crear un nuevo usuario con envío de email de bienvenida
 */
export class CreateUserUseCase {
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/use-cases`,
  });

  constructor(
    private readonly userRepository: UserRepository,
    private readonly encryptionAdapter: EncryptionAdapter,
    private readonly uuidAdapter: UuidAdapter,
    private readonly emailService: EmailService
  ) {}

  /**
   * Ejecuta el caso de uso
   * @param rawCreateData Datos sin validar para crear el usuario
   * @returns Datos del usuario creado
   */
  async execute(rawCreateData: unknown): Promise<CreateUserResponseDTO> {
    try {
      // Validar entrada con Zod
      const createUserDTO = validateCreateUserRequest(rawCreateData);
      
      this.logger.info(`Creating new user with email: ${createUserDTO.email}`);

      // Verificar si el usuario ya existe
      const existingUser = await this.userRepository.findByEmail(createUserDTO.email);
      if (existingUser) {
        this.logger.warn(`User with email ${createUserDTO.email} already exists`);
        throw new ApplicationError(`User with email ${createUserDTO.email} already exists`);
      }

      // Generar un ID único
      const userId = this.uuidAdapter.generate();

      // Encriptar la contraseña
      const hashedPassword = await this.encryptionAdapter.hash(createUserDTO.password);

      // Generar código de verificación
      const verificationCode = this.uuidAdapter.generate();

      // Crear entidad de usuario
      const user = new User({
        id: userId,
        email: createUserDTO.email,
        password: hashedPassword,
        firstName: createUserDTO.firstName,
        lastName: createUserDTO.lastName,
        role: createUserDTO.role || UserRole.USER,
        isActive: false, // Usuario inactivo hasta verificar email
        verificationCode,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Guardar el usuario
      const savedUser = await this.userRepository.save(user);

      // Enviar email de bienvenida (después de guardar exitosamente)
      await this.sendWelcomeEmail(savedUser);

      this.logger.info(`User created successfully: ${savedUser.id}`);

      // Retornar respuesta DTO
      return {
        id: savedUser.id,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        role: savedUser.role,
        isActive: savedUser.isActive,
        createdAt: savedUser.createdAt,
        updatedAt: savedUser.updatedAt,
        verificationCode: savedUser.verificationCode || undefined
      };
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        throw new ApplicationError(`Validation failed: ${errorMessages}`);
      }
      
      if (error instanceof ApplicationError) {
        throw error;
      }

      this.logger.error('Error creating user:', error);
      throw new ApplicationError(`Error creating user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Envía el email de bienvenida al usuario recién creado
   * @param user Usuario al que enviar el email
   */
  private async sendWelcomeEmail(user: User): Promise<void> {
    try {
      this.logger.info(`Sending welcome email to: ${user.email}`);

      // Construir URL de verificación (ajusta según tu frontend)
      const verificationUrl = `${config.app.baseUrl || 'https://localhost:4000'}/verify-email?code=${user.verificationCode}`;
      
      // Variables para el template
      const templateVariables = {
        // Información del usuario
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.getFullName(),
        email: user.email,
        
        // Información de verificación
        verificationCode: user.verificationCode,
        verificationUrl: verificationUrl,
        
        // Información de la aplicación
        appName: config.app.name,
        appVersion: config.app.version,
        appDescription: config.app.description,
        
        // URLs útiles (ajusta según tu aplicación)
        dashboardUrl: `${config.app.baseUrl || 'https://localhost:4000'}/dashboard`,
        profileUrl: `${config.app.baseUrl || 'https://localhost:4000'}/profile`,
        supportEmail: 'support@onelessonperday.com',
        
        // Metadata
        emailType: 'welcome',
        currentYear: new Date().getFullYear(),
        createdAt: user.createdAt.toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      };

      const emailResult = await this.emailService.sendTemplateEmail({
        template: 'welcome', // Archivo welcome.hbs
        to: {
          email: user.email,
          name: user.getFullName()
        },
        subject: `¡Bienvenido a ${config.app.name}! Verifica tu cuenta`,
        variables: templateVariables,
        priority: 'high'
      });

      if (emailResult.success) {
        this.logger.info(`Welcome email sent successfully to: ${user.email}, MessageID: ${emailResult.messageId}`);
      } else {
        // Log error pero no fallar la creación del usuario
        this.logger.error(`Failed to send welcome email to: ${user.email}, Error: ${emailResult.error}`);
        
        // En desarrollo, podrías querer fallar
        if (config.app.env === 'development') {
          this.logger.warn('Email sending failed in development, but continuing...');
        }
      }
    } catch (error) {
      // Log error pero no fallar la creación del usuario
      this.logger.error(`Error sending welcome email to: ${user.email}:`, error);
      
      // En desarrollo, podrías querer fallar
      if (config.app.env === 'development') {
        this.logger.warn('Email service error in development, but continuing...');
      }
      
      // En producción, podrías enviar a una cola de reintentos
      // TODO: Implementar cola de emails fallidos
    }
  }
}