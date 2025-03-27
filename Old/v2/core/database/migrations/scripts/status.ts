import { DataSource, Migration } from 'typeorm';
import { createDataSource } from '../../config/typeorm.config';
import { Logger } from '../../../../utils/logger';

const logger = new Logger('MigrationStatus');

interface MigrationEntry {
    id: number;
    timestamp: Date;
    name: string;
    applied: boolean;
}

/**
 * Toont de status van alle migraties
 */
async function showMigrationStatus(): Promise<void> {
    let dataSource: DataSource | undefined;

    try {
        // Initialiseer database connectie
        dataSource = createDataSource();
        await dataSource.initialize();
        logger.info('Database connection initialized');

        // Haal alle migraties op
        const migrations = await dataSource.query(
            'SELECT * FROM migrations ORDER BY timestamp DESC'
        ) as MigrationEntry[];

        // Toon overzicht
        let statusOutput = '\nMigration Status:\n\n';
        statusOutput += 'Timestamp            Name                    Applied\n';
        statusOutput += '---------------------------------------------------\n';

        for (const migration of migrations) {
            const timestamp = new Date(migration.timestamp).toISOString()
                .replace(/T/, ' ')
                .replace(/\..+/, '');
            const name = migration.name.padEnd(30);
            statusOutput += `${timestamp}  ${name}  ${migration.applied ? '✓' : '✗'}\n`;
        }

        // Log het overzicht
        logger.info(statusOutput);

        // Check voor pending migrations
        const pendingMigrations = await dataSource.showMigrations();
        if (pendingMigrations) {
            let pendingOutput = '\nPending Migrations:\n\n';
            
            const queryRunner = dataSource.createQueryRunner();
            const appliedMigrations = await dataSource.getRepository(Migration)
                .createQueryBuilder('migration')
                .orderBy('migration.timestamp', 'DESC')
                .getMany();

            const schemaBuilder = dataSource.driver.createSchemaBuilder();
            const pendingFiles = (await schemaBuilder.build()) as unknown as Migration[];

            for (const file of pendingFiles) {
                const isApplied = appliedMigrations.some(
                    (m: Migration) => m.name === file.name
                );
                if (!isApplied) {
                    pendingOutput += `- ${file.name}\n`;
                }
            }
            
            logger.info(pendingOutput);
            await queryRunner.release();
        } else {
            logger.info('\nNo pending migrations');
        }

    } catch (error) {
        logger.error('Failed to show migration status', error);
        throw error;

    } finally {
        if (dataSource?.isInitialized) {
            await dataSource.destroy();
            logger.info('Database connection closed');
        }
    }
}

// Start het script
if (require.main === module) {
    showMigrationStatus().catch(error => {
        logger.error('Migration status script failed', error);
        process.exit(1);
    });
}

// Exporteer voor gebruik in andere scripts
export { showMigrationStatus };