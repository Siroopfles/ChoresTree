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