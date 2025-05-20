// src/infrastructure/database/config/database.config.ts
import { DataSource, DataSourceOptions } from "typeorm";
import { config } from "./env";

/**
 * Configuración mejorada para la conexión a la base de datos
 * Incluye parámetros optimizados para el pool de conexiones y manejo de errores
 */
const dataSourceOptions: DataSourceOptions = {
  type: config.database.type as any,
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.name,
  synchronize: config.database.synchronize,
  logging: config.database.logging,
  timezone: config.database.timezone,
  entities: [
              __dirname + "/../../domain/entities/**/*.entity{.ts,.js}",
              __dirname + "/../../database/entities/**/*.entity{.ts,.js}"
            ],
  migrations: [__dirname + "/migrations/**/*{.ts,.js}"],
  subscribers: [],
  
  // Configuración mejorada del pool de conexiones
  extra: {
    // Pool config
    connectionLimit: config.database.connectionLimit,
    queueLimit: 0, // Sin límite en la cola (0 = ilimitado)
    waitForConnections: true, // Esperar cuando no hay conexiones disponibles
    
    // Connection timeouts
    connectTimeout: 10000, // Timeout de conexión (10 segundos)
    acquireTimeout: 60000, // Timeout para adquirir conexiones (60 segundos)
    idleTimeout: 60000, // Tiempo de inactividad antes de cerrar una conexión (60 segundos)
    
    // Keepalive checks
    enableKeepAlive: true,
    keepAliveInitialDelay: 30000, // 30 segundos
    
    // Retry strategy
    autoReconnect: true,
    maxReconnects: 10,
    reconnectDelay: 5000, // 5 segundos
  },
  
  // SSL para producción
  ssl: process.env.NODE_ENV === 'production'
    ? {
        rejectUnauthorized: true,
        // Si tienes certificados, puedes descomentar esto:
        // ca: fs.readFileSync('/path/to/ca-cert.pem').toString(),
      }
    : false,
};

export const AppDataSource = new DataSource(dataSourceOptions);

/**
 * Inicializa la conexión a la base de datos
 * @param retries Número de reintentos (por defecto: 5)
 * @param delay Tiempo de espera entre reintentos en ms (por defecto: 5000)
 */
export const initializeDatabase = async (): Promise<DataSource> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log(`[Database] Connected to ${config.database.type} database at ${config.database.host}:${config.database.port}`);
    }
    return AppDataSource;
  } catch (error) {
    console.error("[Database] Error during Data Source initialization:", error);
    throw error;
  }
};