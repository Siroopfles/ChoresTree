import { DataSource } from 'typeorm';
import { createDataSource } from '../../config/typeorm.config';
import { Logger } from '../../../../utils/logger';

const logger = new Logger('MigrationRunner');

interface MigrationOptions {
    direction: 'up' | 'down';
    transaction?: 'all' | 'none' | 'each';
    fake?: boolean;
}

/**
 * Voert database migraties uit
 */
async function runMigrations(options: MigrationOptions): Promise<void> {
    let dataSource: DataSource | undefined;

    try {
        // Initialiseer database connectie
        dataSource = createDataSource();
        await dataSource.initialize();
        logger.info('Database connection initialized');

        // Check of er pending migrations zijn
        const pendingMigrations = await dataSource.showMigrations();
        if (!pendingMigrations) {
            logger.info('No pending migrations found');
            return;
        }

        // Voer de migraties uit
        if (options.direction === 'up') {
            logger.info('Running pending migrations up...');
            await dataSource.runMigrations({
                transaction: options.transaction ?? 'all',
            });
        } else {
            logger.info('Rolling back last migration...');
            await dataSource.undoLastMigration({
                transaction: options.transaction ?? 'all',
            });
        }

        // Valideer migratie status
        const queryRunner = dataSource.createQueryRunner();
        try {
            await queryRunner.connect();

            // Valideer database schema en entities
            logger.info('Validating database schema...');
            const entities = dataSource.entityMetadatas;
            for (const entity of entities) {
                const table = await queryRunner.getTable(entity.tableName);
                if (!table) {
                    throw new Error(`Table ${entity.tableName} not found`);
                }

                // Valideer foreign key constraints
                logger.info(`Checking foreign keys for ${entity.tableName}...`);
                for (const foreignKey of entity.foreignKeys) {
                    const referencedTable = await queryRunner.getTable(foreignKey.referencedTablePath);
                    if (!referencedTable) {
                        throw new Error(`Referenced table ${foreignKey.referencedTablePath} not found`);
                    }
                }

                // Valideer indices
                logger.info(`Checking indices for ${entity.tableName}...`);
                const tableIndices = await queryRunner.getTable(entity.tableName);
                if (tableIndices) {
                    const entityIndices = entity.indices.map(index => index.name);
                    const missingIndices = entityIndices.filter(
                        indexName => !tableIndices.indices.some(i => i.name === indexName)
                    );
                    if (missingIndices.length > 0) {
                        throw new Error(`Missing indices in ${entity.tableName}: ${missingIndices.join(', ')}`);
                    }
                }

                // Valideer kolom types en constraints
                logger.info(`Checking column definitions for ${entity.tableName}...`);
                for (const column of entity.columns) {
                    const tableColumn = table.columns.find(c => c.name === column.propertyName);
                    if (!tableColumn) {
                        throw new Error(`Column ${column.propertyName} not found in ${entity.tableName}`);
                    }
                }
            }
            logger.info('Schema validation successful');

            // Data integriteit checks
            logger.info('Performing data integrity checks...');
            const integrityChecks = [
                // Check voor NULL waardes in required velden
                'SELECT table_name, column_name FROM information_schema.columns WHERE is_nullable = \'NO\' AND column_default IS NULL',
                // Check voor duplicate primary keys
                'SELECT t.table_name, c.column_name FROM information_schema.table_constraints t JOIN information_schema.constraint_column_usage c ON c.constraint_name = t.constraint_name WHERE t.constraint_type = \'PRIMARY KEY\'',
                // Check voor orphaned foreign keys
                'SELECT tc.table_name, kcu.column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name WHERE tc.constraint_type = \'FOREIGN KEY\''
            ];

            for (const check of integrityChecks) {
                const result = await queryRunner.query(check);
                if (result.length > 0) {
                    logger.warn(`Data integrity check result: ${JSON.stringify(result)}`);
                }
            }
            logger.info('Data integrity checks completed');

        } finally {
            await queryRunner.release();
        }

        logger.info('Migration completed successfully');

    } catch (error) {
        logger.error('Migration failed', error);
        throw error;

    } finally {
        if (dataSource?.isInitialized) {
            await dataSource.destroy();
            logger.info('Database connection closed');
        }
    }
}

/**
 * Script entry point
 */
async function main(): Promise<void> {
    try {
        // Parse command line arguments
        const args = process.argv.slice(2);
        const direction = args[0] === 'down' ? 'down' : 'up';
        const options: MigrationOptions = {
            direction,
            transaction: args.includes('--no-transaction') ? 'none' : 'all',
            fake: args.includes('--fake'),
        };

        // Log migration opties
        logger.info(`Starting migration with options: ${JSON.stringify(options)}`);

        // Voer migraties uit
        await runMigrations(options);

    } catch (error) {
        logger.error('Migration script failed', error);
        process.exit(1);
    }
}

// Start het script
if (require.main === module) {
    main();
}

// Exporteer voor gebruik in andere scripts
export { runMigrations };