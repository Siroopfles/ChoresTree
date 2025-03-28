import { IEncryptionConfig, EncryptionError } from '../interfaces/encryption.interface';

/**
 * Default encryptie configuratie
 */
export const DEFAULT_ENCRYPTION_CONFIG: IEncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyRotation: {
    enabled: true,
    intervalDays: 30
  }
};

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
      throw new EncryptionError(
        'Ongeldige encryptie sleutel',
        'INVALID_KEY'
      );
    }
  }

  /**
   * Valideer encrypted data
   * @throws EncryptionError als de data ongeldig is
   */
  static validateEncryptedData(data: string): void {
    if (!data || typeof data !== 'string') {
      throw new EncryptionError(
        'Ongeldige encrypted data',
        'INVALID_DATA'
      );
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
    crypto.getRandomValues(array);
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
        'tag' in data
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
    tag: Buffer
  ): string => {
    return JSON.stringify({
      iv: iv.toString('hex'),
      content: content,
      tag: tag.toString('hex')
    });
  }
};