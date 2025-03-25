import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCommandPermissions1711336900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Voeg commandPermissions kolom toe aan server_settings
    await queryRunner.query(`
      ALTER TABLE server_settings
      ADD COLUMN IF NOT EXISTS command_permissions JSONB DEFAULT '{}' NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Verwijder commandPermissions kolom
    await queryRunner.query(`
      ALTER TABLE server_settings
      DROP COLUMN IF EXISTS command_permissions
    `);
  }
}