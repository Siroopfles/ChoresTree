# ChoresTree v2

Deze directory bevat de nieuwe v2 codebase structuur van ChoresTree, georganiseerd volgens Atomic Design principes.

## Structuur

```
src/v2/
├── atomic/           # Atomic Design componenten
│   ├── atoms/       # Basis componenten (bijv. inputs, buttons)
│   ├── molecules/   # Samengestelde componenten (bijv. formulieren)
│   └── organisms/   # Complexe componenten (bijv. complete features)
├── core/            # Core systeem componenten
└── config/          # Systeem configuratie
```

## Principes

- Atomic Design structuur voor betere onderhoudbaarheid
- Modulaire opzet voor herbruikbaarheid
- Event-Driven architectuur
- TypeScript voor type-safety