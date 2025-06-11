// src/infrastructure/server.ts
import express, { Application, Request, Response, NextFunction } from "express";
import { createSecureServer, Http2SecureServer } from "http2";
import * as fs from "fs";
import * as path from "path";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { DatabaseManager } from "../database-manager";
import setupLogger from "./utils/logger";
import { config } from "./database/config/env";
import { ControllerService } from "./services/controller.service";
import configureRoutes from "./routes";
import { languageMiddleware } from "./middlewares/language.middleware";

export class Server {
    private app: Application;
    private httpServer: Http2SecureServer | null = null;
    private logger: any;
    private databaseManager: DatabaseManager;
    private controllerService: ControllerService;

    constructor() {
        this.app = express();
        this.logger = setupLogger(config.logging);
        this.databaseManager = DatabaseManager.getInstance();
        this.controllerService = ControllerService.getInstance();
    }

    public async initialize(): Promise<void> {
        try {
            this.logger.info(`Iniciando ${config.app.name} (${config.app.version}) en modo ${config.app.env}`);
            
            // Inicializar conexión a la base de datos
            this.logger.info("Inicializando la conexión a la base de datos...");
            await this.databaseManager.initialize();
            this.logger.info("Conexión a la base de datos establecida correctamente");
            
            // Inicializar el servicio de controladores
            this.logger.info("Inicializando servicio de controladores...");
            await this.controllerService.initialize(this.databaseManager);
            this.logger.info("Servicio de controladores inicializado correctamente");
            
            // Configurar middlewares básicos
            this.setupMiddlewares();
            
            // Configurar rutas DESPUÉS de la inicialización del controlador
            this.setupRoutes();
            
            // Configurar manejo de errores
            this.setupErrorHandling();
            
            // Rutas a los archivos de seguridad
            const certDir = path.join(process.cwd(), 'cert', 'development');
            const privateKeyPath = path.join(certDir, 'private.key');
            const certificatePath = path.join(certDir, 'certificate.pem');
            
            // Verificar que los archivos existen
            if (!fs.existsSync(privateKeyPath) || !fs.existsSync(certificatePath)) {
                throw new Error(`Archivos de seguridad no encontrados en ${certDir}. Asegúrate de que existan private.key y certificate.pem`);
            }
            
            // Opciones para el servidor HTTP/2
            const options = {
                key: fs.readFileSync(privateKeyPath),
                cert: fs.readFileSync(certificatePath),
                allowHTTP1: true // Permite degradar a HTTP/1.1 si el cliente no soporta HTTP/2
            };
            
            // Crear un servidor HTTP/2 seguro
            this.httpServer = createSecureServer(options);
            
            // Conectar Express con el servidor HTTP/2
            this.httpServer.on('request', (req, res) => {
                (this.app as any)(req, res);
            });
            
            // Manejar errores del servidor
            this.httpServer.on('error', (err) => {
                this.logger.error('Error en el servidor HTTP/2:', err);
            });
            
            // Iniciar el servidor HTTP/2
            const port = config.app.port;
            this.httpServer.listen(port, () => {
                this.logger.info(`🚀 Servidor HTTP/2 iniciado en el puerto ${port} (${config.app.env})`);
                this.logger.info(`📚 API disponible en https://localhost:${port}${config.api.prefix}`);
                this.logger.info(`🔐 Autenticación: https://localhost:${port}${config.api.prefix}/auth`);
                this.logger.info(`👥 Usuarios: https://localhost:${port}${config.api.prefix}/users`);
                this.logger.info(`✉️ Verificación: https://localhost:${port}${config.api.prefix}/email-verification`);
                this.logger.info(`🩺 Health Check: https://localhost:${port}${config.api.prefix}/health`);
                this.logger.info(`🛡️ Seguridad: HTTP/2, Helmet, CORS y JWT activados`);
                this.logger.info(`🗜️ Optimización: HTTP/2 y compresión habilitados`);
                this.logger.info(`⚖️ Protección: Rate limiting configurado (${config.api.rateLimit} solicitudes/${config.api.rateLimitWindow})`);
                this.logger.info(`🔌 Base de datos: Conexión establecida y monitorizada`);
                
                // Mostrar rutas disponibles
                this.logger.info('📋 Rutas de autenticación disponibles:');
                this.logger.info(`  POST ${config.api.prefix}/auth/login - Iniciar sesión`);
                this.logger.info(`  POST ${config.api.prefix}/auth/refresh - Renovar token`);
                this.logger.info(`  POST ${config.api.prefix}/auth/logout - Cerrar sesión`);
                this.logger.info(`  GET  ${config.api.prefix}/auth/me - Información del usuario actual`);
                this.logger.info(`  POST ${config.api.prefix}/auth/verify - Verificar token`);
            });
            
        } catch (error) {
            this.logger.error('Error al inicializar el servidor:', error);
            throw error;
        }
    }
    
    private setupMiddlewares(): void {
        // Middlewares de seguridad
        this.app.use(helmet({
            contentSecurityPolicy: config.app.env === 'production' ? undefined : false
        }));
        
        // Configuración CORS
        this.app.use(cors({
            origin: config.cors.origin,
            methods: config.cors.methods,
            credentials: true // Importante para cookies de autenticación
        }));
        
        // Parser de cookies para refresh tokens
        this.app.use(cookieParser());
        
        // Compresión de respuestas
        this.app.use(compression());

        // Middleware de idioma
        this.app.use(languageMiddleware);
        
        // Parseo de body en solicitudes
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        
        // Rate limiting para prevenir ataques de fuerza bruta
        const limiter = rateLimit({
            windowMs: Number(config.api.rateLimitWindow) * 60 * 1000, 
            max: config.api.rateLimit,
            standardHeaders: true,
            legacyHeaders: false,
            message: {
                status: 'error',
                message: 'Too many requests, please try again later'
            }
        });
        this.app.use(limiter);
        
        // Rate limiting más estricto para endpoints de autenticación
        const authLimiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 10, // Máximo 10 intentos de login por IP cada 15 minutos
            standardHeaders: true,
            legacyHeaders: false,
            message: {
                status: 'error',
                message: 'Too many authentication attempts, please try again later'
            }
        });
        this.app.use(`${config.api.prefix}/auth/login`, authLimiter);
        
        // Logging de solicitudes
        this.app.use((req: Request, _res: Response, next: NextFunction) => {
            // No loguear contraseñas
            const logBody = req.path.includes('/login') || req.path.includes('/password') 
                ? { ...req.body, password: '[HIDDEN]' }
                : req.body;
            
            this.logger.info(`${req.method} ${req.url}`, {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                body: Object.keys(logBody).length > 0 ? logBody : undefined
            });
            next();
        });
    }
    
    private setupRoutes(): void {
        this.logger.info('Configurando rutas en el servidor...');
        
        // Obtenemos los controladores ya inicializados
        const userController = this.controllerService.getUserController();
        const authController = this.controllerService.getAuthController();
        const emailVerificationController = this.controllerService.getEmailVerificationController();
        
        // Log para verificar que los controladores existen
        this.logger.debug('Controladores obtenidos:', {
            userController: !!userController,
            authController: !!authController,
            emailVerificationController: !!emailVerificationController
        });
        
        // Configuramos las rutas con los controladores
        configureRoutes(this.app, {
            userController,
            authController,
            emailVerificationController
        });
        
        this.logger.info('Rutas configuradas correctamente');
    }
    
    private setupErrorHandling(): void {
        // Middleware para manejo de errores globales
        this.app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
            const status = err.status || 500;
            const message = err.message || 'Error interno del servidor';
            
            // No loguear errores de autenticación como errores graves
            if (status === 401 || status === 403) {
                this.logger.warn(`Auth error ${status}: ${message}`, {
                    ip: req.ip,
                    path: req.path,
                    method: req.method
                });
            } else {
                this.logger.error(`Error ${status}: ${message}`, {
                    stack: err.stack,
                    ip: req.ip,
                    path: req.path,
                    method: req.method
                });
            }
            
            res.status(status).json({
                status: 'error',
                message: config.app.env === 'production' && status === 500 
                    ? 'Error interno del servidor' 
                    : message
            });
        });
    }
    
    public async shutdown(): Promise<void> {
        this.logger.info("Apagando servidor...");
        
        // Primero cerrar el servidor HTTP
        if (this.httpServer) {
            await new Promise<void>((resolve, reject) => {
                this.httpServer?.close((err) => {
                    if (err) {
                        this.logger.error("Error al apagar el servidor HTTP:", err);
                        reject(err);
                    } else {
                        this.logger.info("Servidor HTTP apagado exitosamente");
                        resolve();
                    }
                });
            });
        }
        
        // Luego cerrar la conexión a la base de datos
        try {
            this.logger.info("Cerrando conexión a la base de datos...");
            await this.databaseManager.disconnect();
            this.logger.info("Conexión a la base de datos cerrada exitosamente");
        } catch (error) {
            this.logger.error("Error al cerrar la conexión a la base de datos:", error);
            throw error;
        }
        
        this.logger.info("Apagado completo del servidor");
    }
}