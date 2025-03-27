# Test Setup v2

## Structuur

Tests zijn georganiseerd volgens de Atomic Design structuur:

### Atoms (Basis Componenten)
- `atoms/` - Fundamentele building blocks
  - `entities/` - Database entity tests (Task, Server, etc.)
  - `interfaces/` - Interface implementatie tests
  - `validation/` - Schema validatie tests
  - `events/` - Event type tests
  - `utils/` - Utility functie tests

### Molecules (Samengestelde Componenten)
- `molecules/` - Combinaties van atoms
  - `repositories/` - Data access layer tests
  - `services/` - Business logic service tests
  - `managers/` - Resource manager tests
  - `handlers/` - Event handler tests
  - `factories/` - Object factory tests

### Organisms (Complexe Componenten)
- `organisms/` - Business feature implementations
  - `features/` - Feature integratie tests
  - `workflows/` - Business workflow tests
  - `controllers/` - API endpoint tests
  - `integrations/` - External system integratie tests
  - `commands/` - Discord command tests

## Test Infrastructure

### Database Support
- PostgreSQL op poort 5433
- Transaction rollback na elke test via `withTestTransaction`
- TypeORM voor database operaties

### Test Data
- `TestSeeder` class voor consistent test data management
- Ondersteunt default en custom waardes
- Auto-cleanup na elke test

### Test Helpers
- `withTestTransaction` - Wrapper voor database transacties
- `getTestDb` - Database connectie helper
- Custom matchers (bijvoorbeeld `toBeValidDatabase`)

## Best Practices

1. Gebruik de TestSeeder voor data setup
2. Wrap tests in withTestTransaction
3. Test zowel success als error cases
4. Valideer type constraints
5. Test edge cases expliciet
6. Gebruik descriptieve test names

## Coverage Requirements

- Atoms layer: >90% coverage
- Molecules layer: >85% coverage
- Organisms layer: >80% coverage

## Test Voorbeelden

### Atom Test (Entity)
```typescript
import { withTestTransaction } from '@v2/test/jest/setup-after-env';
import { TaskEntity } from '@v2/atomic/atoms/database/entities/TaskEntity';

describe('TaskEntity (Atoms)', () => {
  it('should validate properties', async () => {
    await withTestTransaction(async () => {
      const server = await testSeeder.seedServer();
      const task = await testSeeder.seedTask(server, {
        title: 'Test Task',
        priority: 'HIGH'
      });
      
      expect(task.priority).toBe('HIGH');
      expect(task.isOverdue()).toBe(false);
    });
  });
});
```

### Molecule Test (Repository)
```typescript
import { TaskRepository } from '@v2/atomic/molecules/repositories/TaskRepository';

describe('TaskRepository (Molecules)', () => {
  it('should query tasks by status', async () => {
    await withTestTransaction(async () => {
      const server = await testSeeder.seedServer();
      await testSeeder.seedTask(server, { status: 'PENDING' });
      await testSeeder.seedTask(server, { status: 'COMPLETED' });
      
      const repo = new TaskRepository(dataSource);
      const pendingTasks = await repo.findByStatus(server.id, 'PENDING');
      
      expect(pendingTasks).toHaveLength(1);
      expect(pendingTasks[0].status).toBe('PENDING');
    });
  });
});
```

### Organism Test (Feature)
```typescript
import { TaskWorkflowManager } from '@v2/atomic/organisms/features/TaskWorkflowManager';

describe('TaskWorkflowManager (Organisms)', () => {
  it('should execute assignment workflow', async () => {
    await withTestTransaction(async () => {
      const server = await testSeeder.seedServer();
      const task = await testSeeder.seedTask(server);
      
      const manager = new TaskWorkflowManager(dataSource);
      await manager.assignTaskToUser({
        taskId: task.id,
        userId: 'user123',
        roleId: 'admin'
      });
      
      // Verify complete workflow resultaten
      const updatedTask = await dataSource.manager.findOneOrFail(TaskEntity, {
        where: { id: task.id }
      });
      
      expect(updatedTask.assignedUserId).toBe('user123');
      expect(updatedTask.status).toBe('IN_PROGRESS');
      expect(updatedTask.updatedAt).toBeGreaterThan(task.updatedAt);
    });
  });
});