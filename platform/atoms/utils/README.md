# Utils

Deze map bevat herbruikbare utility functies en helpers.

## Categories

- Date utilities voor timestamp handling
- String utilities voor text processing
- Type utilities voor type manipulatie
- Test utilities voor unit testing

## Features

- Pure functions
- Type-safe implementaties
- Volledig getest
- Goed gedocumenteerd

## Best Practices

- Keep functions small en focused
- Geen side effects
- Gebruik TypeScript generics
- Error handling patterns

## Gebruik

```typescript
import { formatDate } from './date.utils';
import { createId } from './id.utils';

const timestamp = formatDate(new Date());
const id = createId();
```

## Testing

Alle utilities hebben bijbehorende unit tests:

```typescript
import { formatDate } from './date.utils';

describe('date.utils', () => {
  it('should format date correctly', () => {
    const date = new Date('2025-01-01');
    expect(formatDate(date)).toBe('2025-01-01');
  });
});