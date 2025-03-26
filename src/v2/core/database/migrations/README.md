# Database Migrations

This directory contains all database migrations for the ChoresTree Discord Bot.

## Migration Guidelines

- Use descriptive names for migration files
- Each migration should be reversible (up/down)
- Add clear comments explaining complex changes
- Test migrations in development first
- Include related entity changes

## Running Migrations

```bash
# Generate new migration
npm run typeorm:generate-migration --name=MigrationName

# Run pending migrations
npm run typeorm:run-migrations

# Revert last migration
npm run typeorm:revert-migration
```

## Migration Structure

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class MigrationName implements MigrationInterface {
    name = 'MigrationName'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Changes to apply
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // How to revert changes
    }
}