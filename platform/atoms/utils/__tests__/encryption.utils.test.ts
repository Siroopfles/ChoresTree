import { EncryptionValidator, EncryptionUtils, DEFAULT_ENCRYPTION_CONFIG } from '../encryption.utils';
import { EncryptionError } from '../../interfaces/encryption.interface';

describe('Encryption Utils', () => {
  describe('EncryptionValidator', () => {
    describe('validateKey', () => {
      it('should validate a valid key', () => {
        const validKey = '0'.repeat(32);
        expect(() => EncryptionValidator.validateKey(validKey)).not.toThrow();
      });

      it('should throw on invalid key', () => {
        const invalidKeys = ['', '123', null, undefined];
        invalidKeys.forEach(key => {
          expect(() => EncryptionValidator.validateKey(key as string))
            .toThrow(EncryptionError);
        });
      });
    });

    describe('validateEncryptedData', () => {
      it('should validate valid encrypted data', () => {
        const validData = 'encrypted-data';
        expect(() => EncryptionValidator.validateEncryptedData(validData))
          .not.toThrow();
      });

      it('should throw on invalid encrypted data', () => {
        const invalidData = ['', null, undefined];
        invalidData.forEach(data => {
          expect(() => EncryptionValidator.validateEncryptedData(data as string))
            .toThrow(EncryptionError);
        });
      });
    });
  });

  describe('EncryptionUtils', () => {
    describe('generateKey', () => {
      it('should generate a valid encryption key', async () => {
        const key = await EncryptionUtils.generateKey();
        expect(key).toHaveLength(64); // 32 bytes in hex = 64 chars
        expect(() => EncryptionValidator.validateKey(key)).not.toThrow();
      });
    });

    describe('isEncrypted', () => {
      it('should detect valid encrypted data format', () => {
        const validFormat = JSON.stringify({
          iv: 'abc',
          content: 'def',
          tag: 'ghi'
        });

        expect(EncryptionUtils.isEncrypted(validFormat)).toBe(true);
      });

      it('should reject invalid formats', () => {
        const invalidFormats = [
          '',
          '{}',
          'not-json',
          JSON.stringify({ iv: 'abc' }), // missing fields
          JSON.stringify({ random: 'data' })
        ];

        invalidFormats.forEach(format => {
          expect(EncryptionUtils.isEncrypted(format)).toBe(false);
        });
      });
    });

    describe('formatEncryptedData', () => {
      it('should format encrypted data correctly', () => {
        const iv = Buffer.from('test-iv');
        const content = 'test-content';
        const tag = Buffer.from('test-tag');

        const formatted = EncryptionUtils.formatEncryptedData(content, iv, tag);
        const parsed = JSON.parse(formatted);

        expect(parsed).toEqual({
          iv: iv.toString('hex'),
          content: content,
          tag: tag.toString('hex')
        });
      });
    });
  });

  describe('DEFAULT_ENCRYPTION_CONFIG', () => {
    it('should have required properties', () => {
      expect(DEFAULT_ENCRYPTION_CONFIG).toHaveProperty('algorithm');
      expect(DEFAULT_ENCRYPTION_CONFIG).toHaveProperty('keyRotation');
      
      // Explicit non-null assertion voor TypeScript
      const keyRotation = DEFAULT_ENCRYPTION_CONFIG.keyRotation!;
      expect(keyRotation).toHaveProperty('enabled');
      expect(keyRotation).toHaveProperty('intervalDays');
    });

    it('should have valid values', () => {
      expect(DEFAULT_ENCRYPTION_CONFIG.algorithm).toBe('aes-256-gcm');
      
      // Explicit non-null assertion voor TypeScript
      const keyRotation = DEFAULT_ENCRYPTION_CONFIG.keyRotation!;
      expect(keyRotation.enabled).toBe(true);
      expect(keyRotation.intervalDays).toBe(30);
    });
  });
});