import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';
import { ConfigValueType } from '@/atomic/atoms/config/types/config';

export class CreateConfigTables1711336800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Maak config_values tabel
    await queryRunner.createTable(
      new Table({
        name: 'config_values',
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
            type: 'int',
            generatedType: 'STORED',
            asExpression: 'hash_number(server_id)',
          },
          {
            name: 'key',
            type: 'varchar',
            length: '64',
          },
          {
            name: 'value',
            type: 'jsonb',
          },
          {
            name: 'type',
            type: 'enum',
            enum: Object.values(ConfigValueType),
          },
          {
            name: 'default_value',
            type: 'jsonb',
          },
          {
            name: 'updated_by',
            type: 'varchar',
          },
        ],
      }),
      true
    );

    // Maak config_audit_log tabel
    await queryRunner.createTable(
      new Table({
        name: 'config_audit_log',
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
            type: 'int',
            generatedType: 'STORED',
            asExpression: 'hash_number(server_id)',
          },
          {
            name: 'key',
            type: 'varchar',
            length: '64',
          },
          {
            name: 'old_value',
            type: 'jsonb',
          },
          {
            name: 'new_value',
            type: 'jsonb',
          },
          {
            name: 'action',
            type: 'enum',
            enum: ['update', 'delete', 'create'],
          },
          {
            name: 'updated_by',
            type: 'varchar',
          },
        ],
      }),
      true
    );

    // Maak indexes
    await queryRunner.createIndex(
      'config_values',
      new TableIndex({
        name: 'idx_config_values_server_key',
        columnNames: ['server_id', 'key'],
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'config_values',
      new TableIndex({
        name: 'idx_config_values_server_shard',
        columnNames: ['server_shard_key'],
      })
    );

    await queryRunner.createIndex(
      'config_audit_log',
      new TableIndex({
        name: 'idx_config_audit_server_key',
        columnNames: ['server_id', 'key'],
      })
    );

    await queryRunner.createIndex(
      'config_audit_log',
      new TableIndex({
        name: 'idx_config_audit_server_shard',
        columnNames: ['server_shard_key'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('config_audit_log');
    await queryRunner.dropTable('config_values');
  }
}