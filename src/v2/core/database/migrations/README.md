# Database Migratie Systeem

## Overzicht
Dit systeem beheert database schema versioning en data migraties voor de ChoresTree Discord Bot. Het gebruikt TypeORM's migratie systeem met extra validatie en veiligheidsmaatregelen.

## Features
- Schema versioning met TypeORM
- Transactie-veilige migraties
- Automatische rollback bij fouten
- Validatie checks
- Geautomatiseerde timestamp generatie
- UUID support

## Scripts

### Genereren van een nieuwe migratie
```bash
npm run migration:generate <name> [description]
```

Bijvoorbeeld:
```bash
npm run migration:generate CreateUserTable "Adds user management table"
```

### Uitvoeren van migraties
```bash
# Uitvoeren van pending migraties
npm run migration:run

# Rollback van laatste migratie
npm run migration:revert

# Uitvoeren zonder transactie
npm run migration:run --no-transaction

# Dry run (fake migratie)
npm run migration:run --fake
```

### Migratie Status
```bash
npm run migration:show
```

## Migratie Template
Elke migratie volgt een vast template met:
- Transactie support
- Error handling
- Logging
- Rollback procedures

## Validatie Checks
Het systeem voert automatisch de volgende validaties uit:
1. Schema integriteit
2. Foreign key constraints
3. Index validatie
4. Data integriteit

## Best Practices
1. Altijd `up()` en `down()` methods implementeren
2. Transacties gebruiken voor atomic updates
3. Duidelijke logging toevoegen
4. Validaties toevoegen waar nodig
5. Data backups maken voor grote migraties

## Veiligheid
- Alle schema changes zijn transactioneel
- Automatische rollback bij fouten
- Validatie voor en na migratie
- Version tracking in BaseEntity

## Folder Structuur
```
migrations/
├── scripts/          # Migratie scripts
│   ├── generate.ts   # Voor nieuwe migraties
│   └── run.ts        # Voor uitvoeren migraties
├── templates/        # Migratie templates
│   └── migration.template.txt
└── versions/         # Migratie bestanden
    └── YYYYMMDDHHMMSS-MigrationName.ts