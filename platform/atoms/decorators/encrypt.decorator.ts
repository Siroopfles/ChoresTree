import { IEncryptField } from '../interfaces/encryption.interface';

/**
 * Decorator voor het markeren van entity velden die geëncrypt moeten worden.
 * Wordt gebruikt in combinatie met de EncryptionSubscriber voor automatische encryptie.
 * 
 * @param options Optionele configuratie voor het encrypted veld
 */
export function Encrypt(options: IEncryptField = {}): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    // Metadata key voor encrypted velden
    const metadataKey = 'typeorm:encrypted_fields';
    
    // Haal bestaande encrypted velden op of maak nieuwe array
    const existingFields: string[] = Reflect.getMetadata(metadataKey, target.constructor) || [];
    
    // Voeg nieuw veld toe met opties
    const fieldName = propertyKey.toString();
    existingFields.push(fieldName);
    
    // Sla encrypted veld opties op
    Reflect.defineMetadata(
      `${metadataKey}:${fieldName}`,
      options,
      target.constructor
    );
    
    // Update lijst van encrypted velden
    Reflect.defineMetadata(
      metadataKey,
      [...new Set(existingFields)],
      target.constructor
    );
  };
}