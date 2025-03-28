# Validation

Deze map bevat alle Zod validatie schemas voor type-safe runtime validatie.

## Features

- Zod schemas voor alle entities
- Custom validators
- Type inferentie
- Error handling

## Schema Types

- Entity schemas voor database validatie
- Input schemas voor API requests
- Event schemas voor message validatie
- Configuration schemas

## Best Practices

- Hergebruik common patterns
- Strikte type checking
- Duidelijke error messages
- Test validatie edge cases

## Gebruik

```typescript
import { z } from 'zod';
import { taskSchema } from './schemas/task.schema';

// Runtime validatie met type inferentie
const validateTask = (input: unknown) => {
  return taskSchema.parse(input);
};