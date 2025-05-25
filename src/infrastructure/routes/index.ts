// src/infrastructure/routes/index.ts
import { Router, Application } from 'express';
import { config } from '../database/config/env';
import v1Router from './v1';

// Interfaz para los controladores inicializados
interface Controllers {
  userController: any;
  emailVerificationController: any;
  // Agrega aquí otros controladores según sea necesario
}

/**
 * Configura todas las rutas de la aplicación
 * @param app Instancia de Express Application
 * @param controllers Objeto con los controladores ya inicializados
 */
export const configureRoutes = (app: Application, controllers: Controllers): void => {
  console.log('[DEBUG] Iniciando configuración de rutas...');
  
  // Crear un router principal para la API
  const apiRouter = Router();
  console.log(`[DEBUG] Prefijo de API configurado como: ${config.api.prefix}`);
  
  // Registrar versiones de la API pasando los controladores
  console.log('[DEBUG] Montando v1Router en /v1 en apiRouter');
  apiRouter.use('/', v1Router(controllers));
  
  // Ruta para verificar el estado de la API (health check)
  apiRouter.get('/health', (req, res) => {
    console.log('[DEBUG] Petición recibida en health check');
    res.status(200).json({
      status: 'success',
      service: config.app.name,
      version: config.app.version,
      environment: config.app.env,
      timestamp: new Date().toISOString()
    });
  });
  
  // Ruta raíz para la documentación o información general de la API
  apiRouter.get('/api', (req, res) => {
    console.log('[DEBUG] Petición recibida en la raíz de la API');
    res.status(200).json({
      name: config.app.name,
      description: 'API central del sistema',
      currentVersion: 'v1',
      versions: {
        v1: `${config.api.prefix}/v1`
      },
      health: `${config.api.prefix}/health`,
      documentation: `${config.api.prefix}/docs`
    });
  });
  
  // Middleware para manejar rutas API no encontradas
  apiRouter.use((req, res) => {
    console.log(`[DEBUG] Ruta API no encontrada: ${req.method} ${req.url}`);
    res.status(404).json({
      status: 'error',
      message: 'API route not found'
    });
  });
  
  // Montar el router de API en el prefijo configurado
  console.log(`[DEBUG] Montando apiRouter en ${config.api.prefix}`);
  app.use(config.api.prefix, apiRouter);
  
  // Ruta de bienvenida en la raíz principal
  app.get('/', (req, res) => {
    console.log('[DEBUG] Petición recibida en la raíz de la aplicación');
    res.status(200).json({
      name: config.app.name,
      description: config.app.description,
      version: config.app.version,
      api: {
        endpoint: config.api.prefix,
        documentation: `${config.api.prefix}/docs`,
        health: `${config.api.prefix}/health`
      }
    });
  });
  
  // Middleware para manejar rutas no encontradas a nivel global
  app.use((req, res) => {
    console.log(`[DEBUG] Ruta global no encontrada: ${req.method} ${req.url}`);
    res.status(404).json({
      status: 'error',
      message: 'Route not found'
    });
  });
  
  console.log('[DEBUG] Configuración de rutas completada');
};

export default configureRoutes;