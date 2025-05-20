// src/infrastructure/services/controller.service.ts
import { DatabaseManager } from '../../database-manager';
import setupLogger from '../utils/logger';
import { config } from '../database/config/env';
import { UuidV4Adapter } from '../adaptadores/uuid/uuid.adapter';
import { BcryptAdapter } from '../adaptadores/encryption/bcrypt.adapter';
import { JwtTokenAdapter } from '../adaptadores/jwt/jwt.adapter';
import { UserService } from './user.service';
import { UserController } from '../../interfaces/http/controllers/user.controller';

// Clase singleton para manejar la inicialización y acceso a controladores
export class ControllerService {
    private static instance: ControllerService;
    private initialized: boolean = false;
    private databaseManager!: DatabaseManager;
    private logger: any;
    
    // Adaptadores compartidos
    private uuidAdapter!: UuidV4Adapter;
    private encryptionAdapter!: BcryptAdapter;
    private jwtAdapter!: JwtTokenAdapter;
    
    // Servicios
    private userService!: UserService;
    
    // Controladores
    private userController!: UserController;
    
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
     * Garantiza que la base de datos esté lista antes de inicializar los controladores
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
            this.logger.info('Adaptadores inicializados correctamente');
        } catch (error) {
            this.logger.error('Error inicializando adaptadores:', error);
            throw error;
        }
        
        this.logger.info('Inicializando servicios...');
        try {
            // Inicializar servicios
            this.userService = new UserService(
                this.databaseManager,
                this.encryptionAdapter,
                this.uuidAdapter,
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
    
    // Getters para servicios
    public getUserService(): UserService {
        this.ensureInitialized();
        return this.userService;
    }
    
    // Getters para controladores
    public getUserController(): UserController {
        this.ensureInitialized();
        return this.userController;
    }
    
    // Método auxiliar para verificar si está inicializado
    private ensureInitialized(): void {
        if (!this.initialized) {
            throw new Error('ControllerService not initialized. Call initialize() first.');
        }
    }
}