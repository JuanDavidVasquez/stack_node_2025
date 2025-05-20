import "reflect-metadata";
import { setupLogger } from "./infrastructure/utils/logger";
import { config } from "./infrastructure/database/config/env";
import { Server } from "./infrastructure/server"; 

const logger = setupLogger(config.logging);

async function bootstrap() {
  try {
    const server = new Server();
    await server.initialize();

    // Handle shutdown signals
    const handleShutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received, shutting down gracefully`);
      try {
        await server.shutdown();
        logger.info("Application terminated successfully");
        process.exit(0);
      } catch (error) {
        logger.error("Error during shutdown:", error);
        process.exit(1);
      }
    };

    // Register signal handlers
    process.on("SIGTERM", () => handleShutdown("SIGTERM"));
    process.on("SIGINT", () => handleShutdown("SIGINT"));
    
  } catch (error) {
    logger.error("Failed to start application:", error);
    process.exit(1);
  }
}

// Initialize application
bootstrap();