# Active Context: ChoresTree Discord Bot V3

---

## Huidige Focus

### 1. Nieuw V3 Platform Development
⚠️ Dit is een volledig nieuw product, geen migratie van v2 ⚠️

- Clean-slate development approach
- Geen backwards compatibility vereist
- Focus op modulaire architectuur
- Test-driven development vanaf start

### 2. Platform Development Flow
1. Bottom-up ontwikkeling
   - Start met /atoms layer
   - Dan /molecules layer
   - Vervolgens /organisms layer
   - Tenslotte platform services

2. Test-First Approach
   - Unit tests per component
   - Integration tests per module
   - E2E tests voor workflows
   - Performance testing setup

### 3. Core Infrastructuur
1. Development Environment
   - Docker compose setup
   - Database containers
   - Message queue
   - Caching layer

2. Core Services
   - Database connectie
   - Event bus implementatie
   - Caching framework
   - Monitoring setup

3. Testing Infrastructure
   - Jest configuratie
   - Test database setup
   - Mock frameworks
   - CI/CD pipeline

## Immediate Tasks

### 1. Atoms Layer Development
1. /entities
   - Base entity class
   - Task entity
   - Notification entity
   - Role entity

2. /interfaces
   - Repository interfaces
   - Service contracts
   - Event definitions
   - Type interfaces

3. /validation
   - Zod schema setup
   - Validation decorators
   - Custom validators
   - Type guards

4. /utils
   - Date utilities
   - String helpers
   - Type utilities
   - Test helpers

### 2. Development Setup
1. Environment Configuration
   - Docker compose files
   - Environment variables
   - Build scripts
   - Development tools

2. Testing Framework
   - Jest configuration
   - Test utilities
   - Mock system
   - Coverage setup

3. CI/CD Pipeline
   - GitHub Actions
   - Build workflow
   - Test automation
   - Deployment flow

## Critical Focus Points

### 1. V2 Pattern Adoption
- Hergebruik van succesvolle v2 patterns:
  * Multi-provider caching systeem
  * Event decorators en monitoring
  * Health checks en metrics
  * Test infrastructure en utilities

### 2. Quality First
- Test-driven development
- Code review process
- Documentation requirements
- Performance benchmarks

### 2. Architecture Compliance
- Layer separation
- Dependencies flow
- Interface contracts
- Event patterns

### 3. Developer Experience
- Clear documentation
- Local development
- Debug tooling
- Fast feedback loops

## Success Criteria

### Immediate (2 weken)
- Complete /atoms layer met v2 entities als referentie
- Basic test framework met v2 test utilities
- Local development met v2 configuratie als basis
- CI pipeline gebaseerd op v2 best practices

### Short Term (1 maand)
- /molecules layer
- Integration tests
- Event system
- Initial features

### Medium Term (3 maanden)
- Complete platform
- 90% test coverage
- Production ready
- Full monitoring