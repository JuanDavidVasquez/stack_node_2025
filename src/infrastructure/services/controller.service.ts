// src/infrastructure/services/controller.service.ts (actualizado con Auth)
import { DatabaseManager } from '../../database-manager';
import setupLogger from '../utils/logger';
import { config } from '../database/config/env';
import { UuidV4Adapter } from '../adaptadores/uuid/uuid.adapter';
import { BcryptAdapter } from '../adaptadores/encryption/bcrypt.adapter';
import { JwtTokenAdapter } from '../adaptadores/jwt/jwt.adapter';
import { NodemailerAdapter } from '../adaptadores/email/nodemailer.adapter';
import { UserService } from './user.service';
import { AuthService } from './auth.service';
import { EmailService } from './email.service';
import { EmailVerificationService } from './email-verification.service';
import { UserController } from '../../interfaces/http/controllers/user.controller';
import { AuthController } from '../../interfaces/http/controllers/auth.controller';
import { EmailVerificationController } from '../../interfaces/http/controllers/email-verification.controller';
import { UserRepositoryImpl } from '../repositories/user.repository.impl';
import { AuthRepositoryImpl } from '../repositories/auth.repository.impl';
import { EmailVerificationRepositoryImpl } from '../repositories/email-verification.repository.impl';
import { SendEmailVerificationUseCase } from '../../application/use-case/email-verification/send-email-verification.use-case';
import { VerifyEmailCodeUseCase } from '../../application/use-case/email-verification/verify-email-code.use-case';
import { ResendEmailVerificationUseCase } from '../../application/use-case/email-verification/resend-email-verification.use-case';

export class ControllerService {
    private static instance: ControllerService;
    private initialized: boolean = false;
    private databaseManager!: DatabaseManager;
    private logger: any;
    
    // Adaptadores compartidos
    private uuidAdapter!: UuidV4Adapter;
    private encryptionAdapter!: BcryptAdapter;
    private jwtAdapter!: JwtTokenAdapter;
    private nodemailerAdapter!: NodemailerAdapter;
    
    // Repositorios
    private userRepository!: UserRepositoryImpl;
    private authRepository!: AuthRepositoryImpl;
    private emailVerificationRepository!: EmailVerificationRepositoryImpl;
    
    // Casos de uso de verificación de email
    private sendEmailVerificationUseCase!: SendEmailVerificationUseCase;
    private verifyEmailCodeUseCase!: VerifyEmailCodeUseCase;
    private resendEmailVerificationUseCase!: ResendEmailVerificationUseCase;
    
    // Servicios
    private emailService!: EmailService;
    private userService!: UserService;
    private authService!: AuthService;
    private emailVerificationService!: EmailVerificationService;
    
    // Controladores
    private userController!: UserController;
    private authController!: AuthController;
    private emailVerificationController!: EmailVerificationController;
    
    private constructor() {
        this.logger = setupLogger({
            ...config.logging,
            dir: `${config.logging.dir}/services`,
        });
    }
    
    public static getInstance(): ControllerService {
        if(!ControllerService.instance) {
            ControllerService.instance = new ControllerService();
        }
        return ControllerService.instance;
    }
    
    public isInitialized(): boolean {
        return this.initialized;
    }
    
    /**
     * Inicializa el servicio de controladores
     */
    public async initialize(databaseManager: DatabaseManager): Promise<void> {
        if (!databaseManager) {
            throw new Error('DatabaseManager is required');
        }
        
        this.databaseManager = databaseManager;
        
        this.logger.info('Inicializando adaptadores...');
        try {
            // Inicializar adaptadores
            this.uuidAdapter = new UuidV4Adapter();
            this.encryptionAdapter = new BcryptAdapter();
            this.jwtAdapter = new JwtTokenAdapter();
            this.nodemailerAdapter = new NodemailerAdapter();
            this.logger.info('Adaptadores inicializados correctamente');
        } catch (error) {
            this.logger.error('Error inicializando adaptadores:', error);
            throw error;
        }
        
        this.logger.info('Inicializando repositorios...');
        try {
            // Inicializar repositorios
            this.userRepository = new UserRepositoryImpl(this.databaseManager);
            this.authRepository = new AuthRepositoryImpl(this.databaseManager, this.encryptionAdapter);
            this.emailVerificationRepository = new EmailVerificationRepositoryImpl(this.databaseManager);
            this.logger.info('Repositorios inicializados correctamente');
        } catch (error) {
            this.logger.error('Error inicializando repositorios:', error);
            throw error;
        }
        
        this.logger.info('Inicializando servicios...');
        try {
            // Inicializar EmailService primero (usa el patrón singleton)
            this.emailService = EmailService.getInstance();
            this.emailService.setAdapter(this.nodemailerAdapter);
            
            // Inicializar casos de uso de verificación de email
            this.sendEmailVerificationUseCase = new SendEmailVerificationUseCase(
                this.emailVerificationRepository,
                this.userRepository,
                this.emailService,
                this.uuidAdapter
            );
            
            this.verifyEmailCodeUseCase = new VerifyEmailCodeUseCase(
                this.emailVerificationRepository,
                this.userRepository
            );
            
            this.resendEmailVerificationUseCase = new ResendEmailVerificationUseCase(
                this.emailVerificationRepository,
                this.userRepository,
                this.emailService,
                this.uuidAdapter
            );
            
            // Inicializar EmailVerificationService
            this.emailVerificationService = new EmailVerificationService(
                this.sendEmailVerificationUseCase,
                this.verifyEmailCodeUseCase,
                this.resendEmailVerificationUseCase
            );
            
            // Inicializar UserService
            this.userService = new UserService(
                this.databaseManager,
                this.encryptionAdapter,
                this.uuidAdapter,
                this.jwtAdapter,
                this.emailService
            );
            
            // Inicializar AuthService
            this.authService = new AuthService(
                this.databaseManager,
                this.encryptionAdapter,
                this.jwtAdapter
            );
            
            this.logger.info('Servicios inicializados correctamente');
        } catch (error) {
            this.logger.error('Error inicializando servicios:', error);
            throw error;
        }
        
        this.logger.info('Inicializando controladores...');
        try {
            // Inicializar controladores
            this.userController = new UserController(this.userService);
            this.authController = new AuthController(this.authService);
            this.emailVerificationController = new EmailVerificationController(this.emailVerificationService);
            this.logger.info('Controladores inicializados correctamente');
        } catch (error) {
            this.logger.error('Error inicializando controladores:', error);
            throw error;
        }
        
        this.initialized = true;
        this.logger.info('ControllerService inicializado correctamente');
    }
    
    // Getters para adaptadores
    public getUuidAdapter(): UuidV4Adapter {
        this.ensureInitialized();
        return this.uuidAdapter;
    }
    
    public getEncryptionAdapter(): BcryptAdapter {
        this.ensureInitialized();
        return this.encryptionAdapter;
    }
    
    public getJwtAdapter(): JwtTokenAdapter {
        this.ensureInitialized();
        return this.jwtAdapter;
    }
    
    public getNodemailerAdapter(): NodemailerAdapter {
        this.ensureInitialized();
        return this.nodemailerAdapter;
    }
    
    // Getters para repositorios
    public getUserRepository(): UserRepositoryImpl {
        this.ensureInitialized();
        return this.userRepository;
    }
    
    public getAuthRepository(): AuthRepositoryImpl {
        this.ensureInitialized();
        return this.authRepository;
    }
    
    public getEmailVerificationRepository(): EmailVerificationRepositoryImpl {
        this.ensureInitialized();
        return this.emailVerificationRepository;
    }
    
    // Getters para casos de uso
    public getSendEmailVerificationUseCase(): SendEmailVerificationUseCase {
        this.ensureInitialized();
        return this.sendEmailVerificationUseCase;
    }
    
    public getVerifyEmailCodeUseCase(): VerifyEmailCodeUseCase {
        this.ensureInitialized();
        return this.verifyEmailCodeUseCase;
    }
    
    public getResendEmailVerificationUseCase(): ResendEmailVerificationUseCase {
        this.ensureInitialized();
        return this.resendEmailVerificationUseCase;
    }
    
    // Getters para servicios
    public getEmailService(): EmailService {
        this.ensureInitialized();
        return this.emailService;
    }
    
    public getUserService(): UserService {
        this.ensureInitialized();
        return this.userService;
    }
    
    public getAuthService(): AuthService {
        this.ensureInitialized();
        return this.authService;
    }
    
    public getEmailVerificationService(): EmailVerificationService {
        this.ensureInitialized();
        return this.emailVerificationService;
    }
    
    // Getters para controladores
    public getUserController(): UserController {
        this.ensureInitialized();
        return this.userController;
    }
    
    public getAuthController(): AuthController {
        this.ensureInitialized();
        return this.authController;
    }
    
    public getEmailVerificationController(): EmailVerificationController {
        this.ensureInitialized();
        return this.emailVerificationController;
    }
    
    // Método auxiliar para verificar si está inicializado
    private ensureInitialized(): void {
        if (!this.initialized) {
            throw new Error('ControllerService not initialized. Call initialize() first.');
        }
    }
}