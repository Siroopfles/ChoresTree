import { MigrationInterface, QueryRunner, TableColumnOptions } from 'typeorm';
import { Logger } from '../../../../utils/logger';

/**
 * Implementeert de BaseEntity schema structuur
 * Deze migratie voegt de basis kolommen toe die alle entities delen
 */
export class CreateBaseEntity20250326084500 implements MigrationInterface {
    private readonly logger = new Logger('CreateBaseEntity');

    // Gemeenschappelijke kolommen voor alle entities
    private readonly baseColumns: TableColumnOptions[] = [
        {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
        },
        {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'now()',
        },
        {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'now()',
        },
        {
            name: 'version',
            type: 'int',
            default: 1,
        },
    ];

    public async up(queryRunner: QueryRunner): Promise<void> {
        this.logger.info('Starting BaseEntity migration');

        try {
            // Start transactie
            await queryRunner.startTransaction();

            // Enable UUID extensie
            this.logger.info('Enabling UUID extension...');
            await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

            // Update trigger functie voor updated_at
            this.logger.info('Creating update timestamp trigger...');
            await queryRunner.query(`
                CREATE OR REPLACE FUNCTION update_timestamp()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = now();
                    NEW.version = OLD.version + 1;
                    RETURN NEW;
                END;
                $$ language 'plpgsql';
            `);

            // Commit transactie
            await queryRunner.commitTransaction();
            this.logger.info('Successfully completed BaseEntity migration');

        } catch (error) {
            // Rollback bij errors
            await queryRunner.rollbackTransaction();
            this.logger.error('Failed to execute BaseEntity migration', error);
            throw error;
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        this.logger.info('Rolling back BaseEntity migration');

        try {
            // Start transactie
            await queryRunner.startTransaction();

            // Verwijder trigger functie
            this.logger.info('Removing update timestamp trigger...');
            await queryRunner.query('DROP FUNCTION IF EXISTS update_timestamp() CASCADE');

            // UUID extensie laten we intact voor compatibiliteit

            // Commit transactie
            await queryRunner.commitTransaction();
            this.logger.info('Successfully rolled back BaseEntity migration');

        } catch (error) {
            // Rollback bij errors
            await queryRunner.rollbackTransaction();
            this.logger.error('Failed to rollback BaseEntity migration', error);
            throw error;
        }
    }
}