import {
  EncryptionValidator,
  EncryptionUtils,
  DEFAULT_ENCRYPTION_CONFIG,
  EncryptionService
} from '../encryption.utils';
import { EncryptionError, IEncryptionResult } from '../../interfaces/encryption.interface';

describe('Encryption Utils', () => {
  // Bestaande EncryptionValidator tests...
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

  // Bestaande EncryptionUtils tests...
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
          tag: 'ghi',
          keyId: '123',
          algorithm: 'aes-256-gcm'
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
        const keyId = '123';
        const algorithm = 'aes-256-gcm';

        const formatted = EncryptionUtils.formatEncryptedData(content, iv, tag, keyId, algorithm);
        const parsed = JSON.parse(formatted);

        expect(parsed).toEqual({
          iv: iv.toString('hex'),
          content: content,
          tag: tag.toString('hex'),
          keyId,
          algorithm
        });
      });
    });
  });

  describe('DEFAULT_ENCRYPTION_CONFIG', () => {
    it('should have required properties', () => {
      expect(DEFAULT_ENCRYPTION_CONFIG).toHaveProperty('algorithm');
      expect(DEFAULT_ENCRYPTION_CONFIG).toHaveProperty('keyRotation');
      
      const keyRotation = DEFAULT_ENCRYPTION_CONFIG.keyRotation!;
      expect(keyRotation).toHaveProperty('enabled');
      expect(keyRotation).toHaveProperty('intervalDays');
      expect(keyRotation).toHaveProperty('gracePeriodDays');
    });

    it('should have valid values', () => {
      expect(DEFAULT_ENCRYPTION_CONFIG.algorithm).toBe('aes-256-gcm');
      
      const keyRotation = DEFAULT_ENCRYPTION_CONFIG.keyRotation!;
      expect(keyRotation.enabled).toBe(true);
      expect(keyRotation.intervalDays).toBe(30);
      expect(keyRotation.gracePeriodDays).toBe(7);
    });
  });

  describe('EncryptionService', () => {
    let service: EncryptionService;
    let initialKey: string;

    beforeEach(async () => {
      service = new EncryptionService();
      initialKey = await EncryptionUtils.generateKey();
      await service.initialize(initialKey);
    });

    describe('encrypt/decrypt', () => {
      it('should successfully encrypt and decrypt data', async () => {
        const testData = 'test data to encrypt';
        
        const encrypted = await service.encrypt(testData);
        expect(encrypted).toBeDefined();
        expect(encrypted.content).toBeDefined();
        expect(encrypted.iv).toBeDefined();
        expect(encrypted.tag).toBeDefined();
        expect(encrypted.keyId).toBeDefined();
        expect(encrypted.algorithm).toBe('aes-256-gcm');

        const decrypted = await service.decrypt(encrypted);
        expect(decrypted).toBe(testData);
      });

      it('should throw on decryption with wrong key', async () => {
        const testData = 'test data';
        const encrypted = await service.encrypt(testData);

        // Roteer sleutel zonder grace period
        await service.rotateKey();
        jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 1000 * 60 * 60 * 24 * 8); // 8 dagen later

        await expect(service.decrypt(encrypted))
          .rejects
          .toThrow(EncryptionError);
      });

      it('should handle large data efficiently', async () => {
        const largeData = 'x'.repeat(1024 * 1024); // 1MB data
        
        const start = Date.now();
        const encrypted = await service.encrypt(largeData);
        const decrypted = await service.decrypt(encrypted);
        const duration = Date.now() - start;

        expect(decrypted).toBe(largeData);
        expect(duration).toBeLessThan(50); // Max 50ms voor 1MB
      });
    });

    describe('key rotation', () => {
      it('should rotate keys successfully', async () => {
        const testData = 'test data';
        const encrypted = await service.encrypt(testData);

        // Roteer sleutel
        const newKey = await service.rotateKey();
        expect(newKey).not.toBe(initialKey);

        // Data moet nog steeds te decrypten zijn binnen grace period
        const decrypted = await service.decrypt(encrypted);
        expect(decrypted).toBe(testData);
      });

      it('should respect grace period', async () => {
        const testData = 'test data';
        const encrypted = await service.encrypt(testData);

        // Roteer sleutel
        await service.rotateKey();

        // Test binnen grace period (5 dagen)
        jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 1000 * 60 * 60 * 24 * 5);
        let decrypted = await service.decrypt(encrypted);
        expect(decrypted).toBe(testData);

        // Test na grace period (8 dagen)
        jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 1000 * 60 * 60 * 24 * 8);
        await expect(service.decrypt(encrypted))
          .rejects
          .toThrow(EncryptionError);
      });

      it('should indicate when rotation is needed', async () => {
        expect(service.needsKeyRotation()).toBe(false);

        // Simuleer dat intervalDays verstreken zijn
        jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 1000 * 60 * 60 * 24 * 31);
        
        expect(service.needsKeyRotation()).toBe(true);
      });
    });

    describe('error handling', () => {
      it('should handle uninitialized service', async () => {
        const uninitializedService = new EncryptionService();
        await expect(uninitializedService.encrypt('test'))
          .rejects
          .toThrow(new EncryptionError('Encryption service niet geïnitialiseerd', 'NOT_INITIALIZED'));
      });

      it('should handle invalid input data', async () => {
        await expect(service.encrypt(''))
          .rejects
          .toThrow(EncryptionError);
      });

      it('should handle invalid encrypted data format', async () => {
        const invalidData = {
          content: 'abc',
          iv: 'def',
          tag: 'ghi',
          keyId: 'invalid',
          algorithm: 'invalid'
        } as IEncryptionResult;

        await expect(service.decrypt(invalidData))
          .rejects
          .toThrow(EncryptionError);
      });

      it('should handle rotation when disabled', async () => {
        const serviceWithoutRotation = new EncryptionService({
          algorithm: 'aes-256-gcm',
          keyRotation: {
            enabled: false,
            intervalDays: 30,
            gracePeriodDays: 7
          }
        });

        await expect(serviceWithoutRotation.rotateKey())
          .rejects
          .toThrow(new EncryptionError('Key rotation niet ingeschakeld', 'ROTATION_DISABLED'));
      });
    });
  });
});