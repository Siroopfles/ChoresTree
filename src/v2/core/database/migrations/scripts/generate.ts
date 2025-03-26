import fs from 'fs';
import path from 'path';

/**
 * Genereert een nieuwe migratie op basis van de template
 */
async function generateMigration(): Promise<void> {
    try {
        // Valideer command line arguments
        const args = process.argv.slice(2);
        if (args.length < 1) {
            console.error('Usage: npm run migration:generate <name> [description]');
            process.exit(1);
        }

        // Haal naam en beschrijving uit arguments
        const migrationName = args[0]
            .split(/[^a-zA-Z0-9]+/)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join('');
        const description = args[1] || `Implements ${migrationName}`;

        // Genereer timestamp voor de bestandsnaam
        const timestamp = new Date().toISOString()
            .replace(/\D/g, '')
            .slice(0, 14);

        // Lees de template
        const templatePath = path.join(__dirname, '../templates/migration.template.txt');
        const template = await fs.promises.readFile(templatePath, 'utf8');

        // Vervang placeholders
        const content = template
            .replace(/{{MIGRATION_NAME}}/g, migrationName)
            .replace(/{{DESCRIPTION}}/g, description);

        // Maak de versions directory als die nog niet bestaat
        const versionsDir = path.join(__dirname, '../versions');
        await fs.promises.mkdir(versionsDir, { recursive: true });

        // Schrijf de nieuwe migratie
        const filename = `${timestamp}-${migrationName}.ts`;
        const migrationPath = path.join(versionsDir, filename);
        await fs.promises.writeFile(migrationPath, content, 'utf8');

        console.warn(`Successfully generated migration: ${filename}`);

    } catch (error) {
        console.error('Failed to generate migration:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

// Start het script
generateMigration();