import crypto from 'crypto';
import {
  IEncryptionConfig,
  EncryptionError,
  IEncryptionResult,
} from '../interfaces/encryption.interface';

/**
 * Default encryptie configuratie
 */
export const DEFAULT_ENCRYPTION_CONFIG: IEncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyRotation: {
    enabled: true,
    intervalDays: 30,
    gracePeriodDays: 7,
  },
};

/**
 * Core encryption service voor het veilig opslaan van gevoelige data
 */
export class EncryptionService {
  private currentKey: string;
  private keyTimestamp: number;
  private previousKey?: string;
  private readonly config: IEncryptionConfig;

  constructor(config: IEncryptionConfig = DEFAULT_ENCRYPTION_CONFIG) {
    this.config = config;
    this.keyTimestamp = Date.now();
  }

  /**
   * Initialiseer de encryption service
   * @param initialKey De initiële encryptie sleutel
   */
  async initialize(initialKey: string): Promise<void> {
    EncryptionValidator.validateKey(initialKey);
    this.currentKey = initialKey;
  }

  /**
   * Encrypt een waarde
   * @param value De te encrypten waarde
   * @returns De geëncrypte data met metadata
   */
  async encrypt(value: string): Promise<IEncryptionResult> {
    if (!this.currentKey) {
      throw new EncryptionError('Encryption service niet geïnitialiseerd', 'NOT_INITIALIZED');
    }

    try {
      // Genereer random IV
      const iv = crypto.randomBytes(12);

      // Maak cipher met huidige sleutel
      // Type cast voor AES-GCM cipher
      const cipher = crypto.createCipheriv(
        this.config.algorithm,
        Buffer.from(this.currentKey, 'hex'),
        iv,
      ) as crypto.CipherGCM;

      // Encrypt data
      const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);

      // Haal authentication tag op
      const tag = cipher.getAuthTag();

      return {
        content: encrypted.toString('base64'),
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        keyId: this.keyTimestamp.toString(),
        algorithm: this.config.algorithm,
      };
    } catch (error) {
      throw new EncryptionError('Encryptie mislukt', 'ENCRYPTION_FAILED', error as Error);
    }
  }

  /**
   * Decrypt een waarde
   * @param encrypted De geëncrypte data met metadata
   * @returns De gedecrypte waarde
   */
  async decrypt(encrypted: IEncryptionResult): Promise<string> {
    if (!this.currentKey) {
      throw new EncryptionError('Encryption service niet geïnitialiseerd', 'NOT_INITIALIZED');
    }

    try {
      // Bepaal welke sleutel te gebruiken
      const keyTimestamp = parseInt(encrypted.keyId);
      const key = this.selectDecryptionKey(keyTimestamp);

      if (!key) {
        throw new EncryptionError('Geen geldige decryptie sleutel gevonden', 'INVALID_KEY_ID');
      }

      // Maak decipher
      // Type cast voor AES-GCM decipher
      const decipher = crypto.createDecipheriv(
        encrypted.algorithm,
        Buffer.from(key, 'hex'),
        Buffer.from(encrypted.iv, 'hex'),
      ) as crypto.DecipherGCM;

      // Zet authentication tag
      decipher.setAuthTag(Buffer.from(encrypted.tag, 'hex'));

      // Decrypt data
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encrypted.content, 'base64')),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      if (error instanceof EncryptionError) {
        throw error;
      }
      throw new EncryptionError('Decryptie mislukt', 'DECRYPTION_FAILED', error as Error);
    }
  }

  /**
   * Roteer de encryptie sleutel
   * @returns De nieuwe sleutel
   */
  async rotateKey(): Promise<string> {
    if (!this.config.keyRotation?.enabled) {
      throw new EncryptionError('Key rotation niet ingeschakeld', 'ROTATION_DISABLED');
    }

    // Bewaar huidige sleutel als vorige
    this.previousKey = this.currentKey;

    // Genereer nieuwe sleutel
    const newKey = await EncryptionUtils.generateKey();
    this.currentKey = newKey;
    this.keyTimestamp = Date.now();

    return newKey;
  }

  /**
   * Check of key rotation nodig is
   */
  needsKeyRotation(): boolean {
    if (!this.config.keyRotation?.enabled) return false;

    const now = Date.now();
    const daysSinceRotation = (now - this.keyTimestamp) / (1000 * 60 * 60 * 24);
    return daysSinceRotation >= this.config.keyRotation.intervalDays;
  }

  /**
   * Selecteer de juiste decryptie sleutel gebaseerd op timestamp
   */
  private selectDecryptionKey(keyTimestamp: number): string | undefined {
    // Als timestamp matcht met huidige sleutel
    if (keyTimestamp === this.keyTimestamp) {
      return this.currentKey;
    }

    // Check grace period voor vorige sleutel
    if (this.previousKey && this.config.keyRotation?.gracePeriodDays) {
      const now = Date.now();
      const daysSinceRotation = (now - keyTimestamp) / (1000 * 60 * 60 * 24);

      if (daysSinceRotation <= this.config.keyRotation.gracePeriodDays) {
        return this.previousKey;
      }
    }

    return undefined;
  }
}

/**
 * Helper class voor het valideren van encryptie parameters
 */
export class EncryptionValidator {
  /**
   * Valideer een encryptie sleutel
   * @throws EncryptionError als de sleutel ongeldig is
   */
  static validateKey(key: string): void {
    if (!key || typeof key !== 'string' || key.length < 32) {
      throw new EncryptionError('Ongeldige encryptie sleutel', 'INVALID_KEY');
    }
  }

  /**
   * Valideer encrypted data
   * @throws EncryptionError als de data ongeldig is
   */
  static validateEncryptedData(data: string): void {
    if (!data || typeof data !== 'string') {
      throw new EncryptionError('Ongeldige encrypted data', 'INVALID_DATA');
    }
  }
}

/**
 * Helper functies voor encryptie operaties
 */
export const EncryptionUtils = {
  /**
   * Genereer een nieuwe random encryptie sleutel
   */
  generateKey: async (): Promise<string> => {
    const array = new Uint8Array(32);
    crypto.randomBytes(32).copy(array);
    return Buffer.from(array).toString('hex');
  },

  /**
   * Check of een waarde encrypted is
   */
  isEncrypted: (value: string): boolean => {
    try {
      const data = JSON.parse(value);
      return (
        data &&
        typeof data === 'object' &&
        'iv' in data &&
        'content' in data &&
        'tag' in data &&
        'keyId' in data &&
        'algorithm' in data
      );
    } catch {
      return false;
    }
  },

  /**
   * Format encrypted data voor opslag
   */
  formatEncryptedData: (
    content: string,
    iv: Buffer,
    tag: Buffer,
    keyId: string,
    algorithm: string,
  ): string => {
    return JSON.stringify({
      iv: iv.toString('hex'),
      content: content,
      tag: tag.toString('hex'),
      keyId,
      algorithm,
    });
  },
};
