# Interfaces

Deze map bevat alle core type definities en interface contracten.

## Features

- Repository interfaces voor data toegang
- Service contracten voor business logic
- Event definities voor messaging
- Utility type definities

## Core Interfaces

- `IBaseRepository` - Basis CRUD operaties
- `IEncryption` - Encryptie contract
- `IEntity` - Basis entiteit contract
- `IValidation` - Validatie contract

## Type Safety

- Gebruik TypeScript strict mode
- Generics voor type safety
- Readonly properties waar nodig
- Discriminated unions voor type guards