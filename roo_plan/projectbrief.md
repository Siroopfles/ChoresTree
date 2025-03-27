# Project Brief: ChoresTree Discord Bot V3

---

## Core Purpose
Een Discord bot-applicatie voor het beheren van schoonmaaktaken binnen Discord servers, gebruikmakend van een nieuwe modulaire platformstructuur volgens Atomic Design principes.

## Project Scope

### Primaire Doelstellingen
- Herstructurering naar nieuwe v3 platformstructuur
- Implementatie van strikte Atomic Design principes
- Verbetering van modulariteit en onderhoudbaarheid

### Platform Structuur
```
/platform
├── /atoms                     # Basis bouwstenen
│   ├── /entities             # Database entities
│   ├── /interfaces           # Interface contracten
│   ├── /validation           # Validatieschema's
│   └── /utils               # Utility functies
├── /molecules                # Complexere componenten
│   ├── /repositories        # Data access layer
│   ├── /services            # Business logic
│   ├── /managers            # Resource managers
│   ├── /handlers            # Event handlers
│   └── /factories           # Object factories
├── /organisms               # Feature implementaties
│   ├── /features            # Business features
│   ├── /workflows           # Complexe workflows
│   ├── /controllers         # API controllers
│   └── /integrations        # Externe integraties
├── /api                     # API communicatie
│   ├── /rest               # REST endpoints
│   ├── /graphql            # GraphQL schema's
│   └── /websockets         # WebSocket handlers
├── /events                  # Event architectuur
│   ├── /publishers         # Event publishers
│   ├── /subscribers        # Event subscribers
│   ├── /schemas            # Event schemas
│   └── eventBus.ts         # Event bus implementatie
├── /role-service           # Discord rol beheer
│   ├── /sync              # Discord synchronisatie
│   └── /managers          # Rollenbeheer
├── /core                   # Core services
│   ├── /cache             # Caching systeem
│   ├── /database          # Database connectie
│   ├── /events            # Event systeem
│   └── /monitoring        # Health monitoring
├── /test                   # Test suites
│   ├── /unit              # Unit tests
│   ├── /integration       # Integratietests
│   └── /e2e               # End-to-end tests
└── README.md
```

### Architecturale Regels

#### 1. Consistente Naamgeving
- Semantische naamgeving die functie beschrijft
- camelCase voor bestands- en mapnamen
- README.md in hoofdletters
- Gerelateerde componenten delen prefix (TaskEntity, ITask, TaskService)

#### 2. Interface Definities
- Interfaces in /atoms/interfaces
- Duidelijke documentatie per interface
- Focus op communicatie tussen modules

#### 3. Mappenstructuur Analyse
Analyse moet gebeuren in deze volgorde:
1. /atoms: Basis bouwstenen eerst begrijpen
2. /molecules: Hoe atoms worden gecombineerd
3. /organisms: Hoe features worden gebouwd
4. Overige mappen voor specifieke functionaliteit

#### 4. Ontwikkelregels
- Begin bij atoms, bouw omhoog naar complexere componenten
- Hogere lagen mogen alleen afhangen van lagere lagen
- Documentatie in README.md per map
- Zoek naar herhalende patterns
- Volledige test coverage vereist

### Kernfunctionaliteiten
1. Taakbeheer
   - CRUD operaties voor taken
   - Toewijzing aan gebruikers
   - Status tracking
   
2. Notificaties
   - Automatische herinneringen
   - Discord integratie
   - Configureerbare alerts

3. Server Configuratie
   - Per-server instellingen
   - Rol-gebaseerde toegang
   - Aanpasbare workflows

### Projectgrenzen
- Strict volgen van nieuwe platformstructuur
- Focus op Discord als primair platform
- Beperkt tot schoonmaaktaak functionaliteit
- Modulaire opzet voor toekomstige uitbreiding