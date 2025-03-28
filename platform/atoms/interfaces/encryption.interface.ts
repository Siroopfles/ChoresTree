/**
 * Interface voor encryptie providers
 * Definieert de basis encryptie operaties
 */
export interface IEncryptionProvider {
  /**
   * Encrypt een waarde
   * @param value De waarde om te encrypten
   * @param key De encryptie sleutel (optioneel, gebruikt default key als niet opgegeven)
   */
  encrypt(value: string, key?: string): Promise<string>;

  /**
   * Decrypt een waarde
   * @param encrypted De geëncrypte waarde
   * @param key De decryptie sleutel (optioneel, gebruikt default key als niet opgegeven)
   */
  decrypt(encrypted: string, key?: string): Promise<string>;

  /**
   * Genereer een nieuwe encryptie sleutel
   */
  generateKey(): Promise<string>;
}

/**
 * Type voor encryptie configuratie
 */
export interface IEncryptionConfig {
  /** Het encryptie algoritme om te gebruiken */
  algorithm: string;
  
  /** De default encryptie sleutel */
  defaultKey?: string;
  
  /** Configuratie voor key rotation */
  keyRotation?: {
    enabled: boolean;
    intervalDays: number;
  };
}

/**
 * Decorator interface voor het markeren van encrypted velden
 */
export interface IEncryptField {
  /**
   * De sleutel om te gebruiken voor dit veld
   * Als niet opgegeven wordt de default key gebruikt
   */
  key?: string;
}

/**
 * Type voor encryptie errors
 */
export class EncryptionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'EncryptionError';
  }
}