import { DataSource } from 'typeorm';
import { Logger } from '../../../utils/logger';

interface TableInfo {
  tablename: string;
}

interface UnusedIndex {
  table: string;
  index: string;
  scans: number;
}

interface MissingIndex {
  table: string;
  columns: string[];
}

interface FragmentedIndex {
  table_name: string;
  index_name: string;
  index_size: string;
  table_size: string;
  index_ratio: number;
}

interface IndexStats {
  last_analyze: string;
  fragmentation: number;
}

export class IndexMaintenanceUtil {
  private readonly logger: Logger;
  private readonly dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.logger = new Logger('IndexMaintenance');
    this.dataSource = dataSource;
  }

  /**
   * Analyze en optimaliseer database indexen
   */
  async maintainIndexes(): Promise<void> {
    try {
      this.logger.info('Starting index maintenance...');

      // Analyze alle tabellen
      await this.analyzeAllTables();

      // Zoek ongebruikte indexen
      const unusedIndexes = await this.findUnusedIndexes();
      this.logger.info(`Found ${unusedIndexes.length} unused indexes`);

      // Zoek ontbrekende indexen
      const missingIndexes = await this.findMissingIndexes();
      this.logger.info(`Found ${missingIndexes.length} recommended missing indexes`);

      // Reindex fragmented indexen
      const reindexed = await this.reindexFragmentedIndexes();
      this.logger.info(`Reindexed ${reindexed} fragmented indexes`);

      this.logger.info('Index maintenance completed successfully');
    } catch (error) {
      this.logger.error('Index maintenance failed', error);
      throw error;
    }
  }

  /**
   * Analyze alle tabellen voor statistieken
   */
  private async analyzeAllTables(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const result = await queryRunner.query(
        'SELECT tablename FROM pg_tables WHERE schemaname = \'public\''
      );
      
      const tables = result as TableInfo[];
      for (const table of tables) {
        this.logger.info(`Analyzing table: ${table.tablename}`);
        await queryRunner.query(`ANALYZE ${table.tablename}`);
      }
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Vind ongebruikte indexen
   */
  private async findUnusedIndexes(): Promise<Array<{ table: string; index: string }>> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const result = await queryRunner.query(`
        SELECT
          schemaname || '.' || tablename as table,
          indexrelname as index,
          idx_scan as scans
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
          AND schemaname = 'public'
        ORDER BY pg_relation_size(indexrelid) DESC
      `);

      const unusedIndexes = result as UnusedIndex[];
      return unusedIndexes.map(idx => ({
        table: idx.table,
        index: idx.index
      }));
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Vind aanbevolen missende indexen
   */
  private async findMissingIndexes(): Promise<Array<{ table: string; columns: string[] }>> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const result = await queryRunner.query(`
        SELECT
          schemaname || '.' || relname as table,
          array_agg(attname) as columns
        FROM pg_stat_user_tables
        JOIN pg_attribute ON attrelid = relid
        WHERE n_live_tup > 10000  -- alleen voor grotere tabellen
          AND attnum > 0
          AND NOT EXISTS (
            SELECT 1
            FROM pg_index
            WHERE indrelid = relid
              AND attnum = ANY(indkey)
          )
        GROUP BY schemaname, relname
        HAVING count(*) > 0
      `);

      const missingIndexes = result as MissingIndex[];
      return missingIndexes.map(idx => ({
        table: idx.table,
        columns: idx.columns
      }));
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Reindex gefragmenteerde indexen
   */
  private async reindexFragmentedIndexes(): Promise<number> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const result = await queryRunner.query(`
        WITH index_bloat AS (
          SELECT
            schemaname || '.' || tablename as table_name,
            indexrelname as index_name,
            pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
            pg_size_pretty(pg_relation_size(indrelid)) as table_size,
            round(100 * pg_relation_size(indexrelid) / pg_relation_size(indrelid)) as index_ratio
          FROM pg_stat_user_indexes
          JOIN pg_index ON indexrelid = pg_stat_user_indexes.indexrelid
          WHERE schemaname = 'public'
            AND pg_relation_size(indrelid) > 0
        )
        SELECT *
        FROM index_bloat
        WHERE index_ratio > 30
        ORDER BY index_ratio DESC
      `);

      const fragmentedIndexes = result as FragmentedIndex[];
      
      // Reindex gefragmenteerde indexen
      let reindexCount = 0;
      for (const idx of fragmentedIndexes) {
        this.logger.info(`Reindexing: ${idx.table_name}.${idx.index_name} (${idx.index_ratio}% bloat)`);
        await queryRunner.query(`REINDEX INDEX ${idx.index_name}`);
        reindexCount++;
      }

      return reindexCount;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Plan onderhoud voor een specifieke index
   */
  async planIndexMaintenance(indexName: string): Promise<{
    needsReindex: boolean;
    fragmentationPercent: number;
    lastAnalyzed: Date;
  }> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const result = await queryRunner.query(`
        SELECT
          last_analyze,
          100 * (bloat_size::float / real_size) as fragmentation
        FROM (
          SELECT
            indexrelname,
            last_analyze,
            pg_relation_size(indexrelid) as bloat_size,
            pg_relation_size(indrelid) as real_size
          FROM pg_stat_user_indexes
          JOIN pg_index ON indexrelid = pg_stat_user_indexes.indexrelid
          WHERE indexrelname = $1
        ) t
      `, [indexName]);

      const stats = result as IndexStats[];
      if (stats.length === 0) {
        throw new Error(`Index ${indexName} not found`);
      }

      const stat = stats[0];
      return {
        needsReindex: stat.fragmentation > 30,
        fragmentationPercent: Math.round(stat.fragmentation * 100) / 100,
        lastAnalyzed: new Date(stat.last_analyze)
      };
    } finally {
      await queryRunner.release();
    }
  }
}