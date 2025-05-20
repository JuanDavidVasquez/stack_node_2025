
// src/infrastructure/adapters/encryption/encryption.interface.ts
export interface EncryptionAdapter {
  /**
   * Encripta una contraseña
   * @param plainPassword Contraseña en texto plano
   * @returns Contraseña encriptada
   */
  hash(plainPassword: string): Promise<string>;
  
  /**
   * Verifica si una contraseña en texto plano coincide con una encriptada
   * @param plainPassword Contraseña en texto plano
   * @param hashedPassword Contraseña encriptada
   * @returns true si coinciden, false en caso contrario
   */
  compare(plainPassword: string, hashedPassword: string): Promise<boolean>;
}
