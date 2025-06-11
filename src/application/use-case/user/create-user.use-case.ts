// src/application/use-cases/user/create-user.use-case.ts

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
import { SupportedLanguage, t, setLanguage } from '../../../shared/i18n';
import { ZodError } from 'zod';

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

  async execute(rawCreateData: unknown, language: SupportedLanguage = 'es'): Promise<CreateUserResponseDTO> {
    try {
      // Establecer idioma globalmente al inicio
      setLanguage(language);
      
      // Validar entrada con Zod
      const createUserDTO = validateCreateUserRequest(rawCreateData);
      
      this.logger.info(`Creating new user with email: ${createUserDTO.email} in language: ${language}`);

      // Verificar si el usuario ya existe
      const existingUser = await this.userRepository.findByEmail(createUserDTO.email);
      if (existingUser) {
        this.logger.warn(`User with email ${createUserDTO.email} already exists`);
        throw new ApplicationError(t('errors.userAlreadyExists', { email: createUserDTO.email }, language));
      }

      // Generar un ID único
      const userId = this.uuidAdapter.generate();

      // Encriptar la contraseña
      const hashedPassword = await this.encryptionAdapter.hash(createUserDTO.password);

      // Generar código de verificación
      const verificationCode = this.uuidAdapter.generate();

      // Crear entidad de usuario - INCLUIR LANGUAGE EN EL USUARIO
      const user = new User({
        id: userId,
        email: createUserDTO.email,
        password: hashedPassword,
        firstName: createUserDTO.firstName,
        lastName: createUserDTO.lastName,
        role: createUserDTO.role || UserRole.USER,
        isActive: false,
        verificationCode,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Guardar el usuario
      const savedUser = await this.userRepository.save(user);

      // PASAR EL IDIOMA EXPLÍCITAMENTE al envío de email
      await this.sendWelcomeEmail(savedUser, language);

      this.logger.info(`User created successfully: ${savedUser.id}`);

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

  private async sendWelcomeEmail(user: User, language: SupportedLanguage): Promise<void> {
    try {
      this.logger.info(`Sending welcome email to: ${user.email} in language: ${language}`);

      // CRÍTICO: Establecer el idioma antes de obtener traducciones
      setLanguage(language);

      // Construir URL de verificación
      const verificationUrl = `${config.app.baseUrl || 'https://localhost:4000'}/verify-email?code=${user.verificationCode}`;
      
      // Preparar variables del template con traducciones en el idioma correcto
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
        
        // URLs útiles
        dashboardUrl: `${config.app.baseUrl || 'https://localhost:4000'}/dashboard`,
        profileUrl: `${config.app.baseUrl || 'https://localhost:4000'}/profile`,
        supportEmail: 'support@onelessonperday.com',
        
        // PASAR IDIOMA EXPLÍCITAMENTE EN LAS VARIABLES
        language: language,
        
        // Textos traducidos con idioma explícito
        welcome: {
          subject: t('welcome.subject', { appName: config.app.name }, language),
          title: t('welcome.title', { firstName: user.firstName }, language),
          subtitle: t('welcome.subtitle', { appName: config.app.name }, language),
          greeting: t('welcome.greeting', { firstName: user.firstName }, language),
          thankYou: t('welcome.thankYou', { appName: config.app.name, firstName: user.firstName }, language),
          accountVerified: t('welcome.accountVerified', {}, language),
          accountInfo: {
            title: t('welcome.accountInfo.title', {}, language),
            email: t('welcome.accountInfo.email', {}, language),
            name: t('welcome.accountInfo.name', {}, language),
            accountType: t('welcome.accountInfo.accountType', {}, language),
            registrationDate: t('welcome.accountInfo.registrationDate', {}, language)
          },
          getStarted: {
            title: t('welcome.getStarted.title', {}, language),
            step1: {
              title: t('welcome.getStarted.step1.title', {}, language),
              description: t('welcome.getStarted.step1.description', {}, language)
            },
            step2: {
              title: t('welcome.getStarted.step2.title', {}, language),
              description: t('welcome.getStarted.step2.description', {}, language)
            },
            step3: {
              title: t('welcome.getStarted.step3.title', {}, language),
              description: t('welcome.getStarted.step3.description', {}, language)
            }
          },
          support: {
            title: t('welcome.support.title', {}, language),
            message: t('welcome.support.message', {}, language),
            contactUs: t('welcome.support.contactUs', {}, language)
          },
          closing: t('welcome.closing', { appName: config.app.name }, language),
          signature: t('welcome.signature', {}, language),
          teamSignature: t('welcome.teamSignature', { appName: config.app.name }, language),
          primaryButton: t('welcome.primaryButton', {}, language)
        },
        
        // Metadata
        emailType: 'welcome',
        currentYear: new Date().getFullYear(),
        createdAt: user.createdAt.toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      };

      // Log para debugging
      this.logger.debug(`Template variables for ${language}:`, {
        language: templateVariables.language,
        welcomeTitle: templateVariables.welcome.title,
        welcomeSubject: templateVariables.welcome.subject
      });

      const emailResult = await this.emailService.sendTemplateEmail({
        template: 'welcome',
        to: {
          email: user.email,
          name: user.getFullName()
        },
        subject: t('welcome.subject', { appName: config.app.name }, language),
        variables: templateVariables,
        priority: 'high'
      });

      if (emailResult.success) {
        this.logger.info(`Welcome email sent successfully to: ${user.email}, MessageID: ${emailResult.messageId}`);
      } else {
        this.logger.error(`Failed to send welcome email to: ${user.email}, Error: ${emailResult.error}`);
        
        if (config.app.env === 'development') {
          this.logger.warn('Email sending failed in development, but continuing...');
        }
      }
    } catch (error) {
      this.logger.error(`Error sending welcome email to: ${user.email}:`, error);
      
      if (config.app.env === 'development') {
        this.logger.warn('Email service error in development, but continuing...');
      }
    }
  }
}
