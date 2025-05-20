// src/infrastructure/adapters/jwt/jwt.interface.ts
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  [key: string]: any;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface JwtAdapter {
  /**
   * Genera un token JWT
   * @param payload Datos a incluir en el token
   * @param expiresIn Tiempo de expiración (formato de tiempo de jsonwebtoken)
   * @returns Token JWT firmado
   */
  sign(payload: JwtPayload, expiresIn?: string | number): Promise<string>;
  
  /**
   * Verifica y decodifica un token JWT
   * @param token Token JWT a verificar
   * @returns Payload decodificado si el token es válido
   * @throws Error si el token no es válido o ha expirado
   */
  verify(token: string): Promise<JwtPayload>;
  
  /**
   * Genera un par de tokens (acceso y refresco)
   * @param payload Datos a incluir en los tokens
   * @returns Objeto con ambos tokens
   */
  generateTokenPair(payload: JwtPayload): Promise<TokenPair>;
}