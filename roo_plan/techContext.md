# Technical Context: ChoresTree Discord Bot

---

## Technology Stack

### Core Technologies
- Node.js v18.x
- TypeScript v5.x
- Discord.js v14.x
- PostgreSQL v15.x

### Development Tools
- pnpm (package manager)
- ESLint + Prettier
- Jest (testing)
- Docker + Docker Compose

### Infrastructure
- GitHub Actions (CI/CD)
- Railway.app (hosting)
- CloudFlare (DNS)
- DataDog (monitoring)

## Technical Constraints

### Performance Constraints
- Max 1000 servers ondersteuning
- Max 100ms response tijd voor commands
- Max 100MB RAM per instance
- 99.9% uptime guarantee

### Security Requirements
- Discord OAuth2 authenticatie
- Rate limiting per server
- Data encryptie in rust
- Regelmatige security audits

### Scalability Constraints
- Horizontale scaling mogelijk
- Database sharding voorbereid
- Caching strategy implemented
- Load balancing ready

## Dependencies

### External Services
- Discord API
  - Version: v10
  - Rate Limits: 50 requests/s
  - Webhook support

- Database
  - Connection pooling
  - Max connections: 100
  - Timeout: 5s

### Internal Dependencies
- Redis voor caching
  - Version: v7.x
  - Max memory: 500MB
  
- Message Queue
  - RabbitMQ v3.x
  - Persistent messages
  - Dead letter queuing

## V2 Architecture

### Codebase Structure
- src/v2/
  - atomic/       # Atomic Design componenten
    - atoms/      # Basis types, entities, validation
    - molecules/  # Services, repositories, handlers
    - organisms/  # Business flows, orchestration
  - core/         # Core systeem componenten
  - config/       # Systeem configuratie

### Design Patterns
- Event-Driven architectuur via EventBus
- Repository pattern voor data access
- Dependency Injection in services
- Template Method in workflows
- Strategy pattern voor validatie
- Observer pattern voor events

### Technical Improvements
- Strict TypeScript type safety met domain-specific types
- Redis caching integratie met sophisticated invalidation
- Event-driven updates met retry policies
- Geautomatiseerde logging met context tracking
- Performance optimalisaties met metrics
- Immutable state management
- Async operation cancellation support
- Typed event system met rich payloads
- Error recovery patterns per domain

### State Management
- Immutable update patterns
- Event sourcing ready architecture
- Optimistic updates met conflict resolution
- Distributed state handling
- Process checkpointing

### Error Handling
- Domain-specific error types
- Structured recovery flows
- Circuit breakers voor externe services
- Rate limiting per resource
- Retry strategies met backoff


## Development Environment

### Required Tools
- VS Code + Extensions
- Node.js v18.x
- Docker Desktop
- pnpm v8.x

### Local Setup
- Docker containers
- Development database
- Mock Discord server
- Test environment

### Testing Framework
- Jest configuratie:
  - Coverage thresholds: 90% (statements, branches, functions, lines)
  - Test matching: **/__tests__/**/*.test.ts
  - Typescript transformatie via ts-jest
  - Path aliases voor @/ imports

#### Current Test Coverage Status
- Overall dekking:
  - Statements: 4.96%
  - Branches: 3.16%
  - Functions: 4.45%
  - Lines: 4.95%

#### Test Suites Overview
- Totaal: 18 test suites
  - Geslaagd: 1 suite
  - Gefaald: 17 suites
  - Database initialisatie problemen geïdentificeerd
  - Performance monitoring via test metrics

#### Mock Strategieën
- Repository mocking voor database operaties
- Event bus mocking voor message handling
- Service mocking met dependency injection
- Redis cache mocking voor performance tests

#### Test Performance Metrics
- Benchmark scenarios gedefinieerd
- Memory usage tracking geïmplementeerd
- Response time monitoring
- Cache hit/miss ratio analyse