import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class InitialSetup1711300742123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Eerst de serverId hash functie maken
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION hash_number(text) RETURNS integer AS $$
      BEGIN
        RETURN ('x' || substr(md5($1), 1, 8))::bit(32)::int;
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);

    // Tasks tabel
    await queryRunner.createTable(
      new Table({
        name: 'tasks',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'server_id',
            type: 'varchar',
          },
          {
            name: 'server_shard_key',
            type: 'integer',
            generatedType: 'STORED',
            asExpression: 'hash_number(server_id)',
          },
          {
            name: 'title',
            type: 'varchar',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'assignee_id',
            type: 'varchar',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED'],
            default: "'PENDING'",
          },
          {
            name: 'deadline',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'completed_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'priority',
            type: 'enum',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
            default: "'MEDIUM'",
          },
          {
            name: 'category',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'reminder_frequency',
            type: 'integer',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Server settings tabel
    await queryRunner.createTable(
      new Table({
        name: 'server_settings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'server_id',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'server_shard_key',
            type: 'integer',
            generatedType: 'STORED',
            asExpression: 'hash_number(server_id)',
          },
          {
            name: 'default_reminder_frequency',
            type: 'integer',
            default: 1440, // 24 uur in minuten
          },
          {
            name: 'default_task_priority',
            type: 'varchar',
            default: "'MEDIUM'",
          },
          {
            name: 'timezone',
            type: 'varchar',
            default: "'Europe/Amsterdam'",
          },
          {
            name: 'notification_channel_id',
            type: 'varchar',
          },
          {
            name: 'admin_role_ids',
            type: 'varchar[]',
            default: "'{}'",
          },
          {
            name: 'manager_role_ids',
            type: 'varchar[]',
            default: "'{}'",
          },
          {
            name: 'enabled_features',
            type: 'jsonb',
            default: `'{"automaticReminders":true,"deadlineEscalation":true,"categoryManagement":true,"taskTemplates":false,"statistics":true}'`,
          },
          {
            name: 'custom_categories',
            type: 'varchar[]',
            default: "'{\"General\",\"Maintenance\",\"Events\"}'",
          },
        ],
      }),
      true
    );

    // Indexen voor performance optimalisatie
    await queryRunner.createIndex(
      'tasks',
      new TableIndex({
        name: 'idx_tasks_server_status',
        columnNames: ['server_id', 'status'],
      })
    );

    await queryRunner.createIndex(
      'tasks',
      new TableIndex({
        name: 'idx_tasks_server_deadline',
        columnNames: ['server_id', 'deadline'],
      })
    );

    await queryRunner.createIndex(
      'tasks',
      new TableIndex({
        name: 'idx_tasks_server_assignee',
        columnNames: ['server_id', 'assignee_id'],
      })
    );

    await queryRunner.createIndex(
      'tasks',
      new TableIndex({
        name: 'idx_tasks_shard_key',
        columnNames: ['server_shard_key'],
      })
    );

    await queryRunner.createIndex(
      'server_settings',
      new TableIndex({
        name: 'idx_settings_shard_key',
        columnNames: ['server_shard_key'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('server_settings', 'idx_settings_shard_key');
    await queryRunner.dropIndex('tasks', 'idx_tasks_shard_key');
    await queryRunner.dropIndex('tasks', 'idx_tasks_server_assignee');
    await queryRunner.dropIndex('tasks', 'idx_tasks_server_deadline');
    await queryRunner.dropIndex('tasks', 'idx_tasks_server_status');
    await queryRunner.dropTable('server_settings');
    await queryRunner.dropTable('tasks');
    await queryRunner.query('DROP FUNCTION IF EXISTS hash_number(text);');
  }
}