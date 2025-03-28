/**
 * Interface voor encryptie providers
 * Definieert de basis encryptie operaties
 */
export interface IEncryptionProvider {
  /**
   * Encrypt een waarde
   * @param value De waarde om te encrypten
   */
  encrypt(value: string): Promise<IEncryptionResult>;

  /**
   * Decrypt een waarde
   * @param encrypted De geëncrypte waarde
   */
  decrypt(encrypted: IEncryptionResult): Promise<string>;

  /**
   * Genereer een nieuwe encryptie sleutel
   */
  generateKey(): Promise<string>;
}

/**
 * Interface voor geëncrypte data
 */
export interface IEncryptionResult {
  /** De geëncrypte content */
  content: string;
  /** De initialization vector */
  iv: string;
  /** De authentication tag */
  tag: string;
  /** ID van de gebruikte sleutel */
  keyId: string;
  /** Het gebruikte algoritme */
  algorithm: string;
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
    gracePeriodDays: number;
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
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'EncryptionError';
  }
}
