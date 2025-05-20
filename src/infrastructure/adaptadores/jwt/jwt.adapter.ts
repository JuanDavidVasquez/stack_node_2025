// src/infrastructure/adapters/jwt/jwt.adapter.ts
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import { JwtAdapter, JwtPayload, TokenPair } from './jwt.interface';
import { InfrastructureError } from '../../../shared/errors/infrastructure.error';
import { setupLogger } from '../../utils/logger';
import { config } from '../../database/config/env';

/**
 * Implementación del adaptador JWT utilizando la biblioteca jsonwebtoken
 */
export class JwtTokenAdapter implements JwtAdapter {
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/adapters/jwt`,
  });
  
  private readonly authSecret: string;
  private readonly algorithm: jwt.Algorithm;
  private readonly privateKey: string | Buffer;
  private readonly publicKey: string | Buffer;
  private readonly useAsymmetric: boolean;

  constructor() {
    this.useAsymmetric = config.jwt.useAsymmetricAlgorithm;
    this.algorithm = config.jwt.algorithm as jwt.Algorithm;
    this.authSecret = config.jwt.authSecret;
    
    // Si se usa algoritmo asimétrico, cargar las claves pública y privada
    if (this.useAsymmetric) {
      try {
        // Corregir la ruta a las claves
        const certDir = path.join(process.cwd(), 'cert', 'development');
        this.logger.info(`Buscando claves JWT en: ${certDir}`);
        
        const privateKeyPath = path.join(certDir, 'private.key');
        const publicKeyPath = path.join(certDir, 'public.key');
        
        // Verificar si los archivos existen
        if (!fs.existsSync(privateKeyPath)) {
          throw new Error(`La clave privada no existe en: ${privateKeyPath}`);
        }
        
        if (!fs.existsSync(publicKeyPath)) {
          // Si no existe public.key, usar certificate.pem
          const certificatePath = path.join(certDir, 'certificate.pem');
          if (fs.existsSync(certificatePath)) {
            this.logger.info(`Usando certificate.pem en lugar de public.key`);
            this.publicKey = fs.readFileSync(certificatePath);
          } else {
            throw new Error(`Ni public.key ni certificate.pem existen en: ${certDir}`);
          }
        } else {
          this.publicKey = fs.readFileSync(publicKeyPath);
        }
        
        this.privateKey = fs.readFileSync(privateKeyPath);
        
        this.logger.info('JWT adapter initialized with asymmetric keys');
      } catch (error) {
        this.logger.error('Error loading JWT keys:', error);
        
        // Usar algoritmo simétrico como fallback
        this.logger.warn('Falling back to symmetric algorithm due to error loading keys');
        this.privateKey = this.authSecret;
        this.publicKey = this.authSecret;
        this.useAsymmetric = false;
        
        // Lanzar error solo en producción
        if (config.app.env === 'production') {
          throw new InfrastructureError(`Error loading JWT keys: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } else {
      // Si se usa algoritmo simétrico, usar la clave secreta
      this.privateKey = this.authSecret;
      this.publicKey = this.authSecret;
      
      this.logger.info('JWT adapter initialized with symmetric key');
    }
  }

  /**
   * Firma un token JWT
   * @param payload Datos a incluir en el token
   * @param expiresIn Tiempo de expiración (formato de tiempo de jsonwebtoken)
   * @returns Token JWT firmado
   */
  async sign(payload: JwtPayload, expiresIn?: string | number): Promise<string> {
    try {
      // Usar el valor por defecto de la configuración si no se proporciona
      const expiration = expiresIn || config.jwt.expiresIn;
      
      const options: jwt.SignOptions = {
        algorithm: this.algorithm,
        // El tipo expiresIn en SignOptions acepta number | StringValue | undefined
        // donde StringValue es un alias para string que representa formatos como "1h", "7d", etc.
        expiresIn: expiration as jwt.SignOptions["expiresIn"]
      };
      
      this.logger.debug(`Signing JWT token for user: ${payload.email} (expires: ${expiration})`);
      return jwt.sign(payload, this.privateKey, options);
    } catch (error) {
      this.logger.error('Error signing JWT token:', error);
      throw new InfrastructureError(`Error signing JWT token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verifica y decodifica un token JWT
   * @param token Token JWT a verificar
   * @returns Payload decodificado si el token es válido
   * @throws Error si el token no es válido o ha expirado
   */
  async verify(token: string): Promise<JwtPayload> {
    try {
      const options: jwt.VerifyOptions = {
        algorithms: [this.algorithm]
      };
      
      this.logger.debug('Verifying JWT token');
      return jwt.verify(token, this.publicKey, options) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        this.logger.warn('JWT token expired');
        throw new InfrastructureError('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        this.logger.warn('Invalid JWT token');
        throw new InfrastructureError('Invalid token');
      }
      
      this.logger.error('Error verifying JWT token:', error);
      throw new InfrastructureError(`Error verifying JWT token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Genera un par de tokens (acceso y refresco)
   * @param payload Datos a incluir en los tokens
   * @returns Objeto con ambos tokens
   */
  async generateTokenPair(payload: JwtPayload): Promise<TokenPair> {
    try {
      this.logger.debug(`Generating token pair for user: ${payload.email}`);
      
      // Token de acceso con expiración corta
      const accessToken = await this.sign(payload, config.jwt.expiresIn);
      
      // Token de refresco con expiración más larga
      const refreshToken = await this.sign(payload, config.jwt.refreshExpiresIn);
      
      return {
        accessToken,
        refreshToken
      };
    } catch (error) {
      this.logger.error('Error generating token pair:', error);
      throw new InfrastructureError(`Error generating token pair: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}