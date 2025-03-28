/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/platform'],
  testMatch: ['**/platform/**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json'
      }
    ]
  },
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1',
    '@v2/(.*)': '<rootDir>/src/v2/$1'
  },
  // Temporary disabled for platform tests
  // globalSetup: '<rootDir>/src/v2/test/jest/setup.ts',
  // globalTeardown: '<rootDir>/src/v2/test/jest/teardown.ts',
  // setupFilesAfterEnv: ['<rootDir>/src/v2/test/jest/setup-after-env.ts'],
  testEnvironmentOptions: {
    url: 'http://localhost'
  },
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  collectCoverageFrom: [
    'platform/**/*.ts',
    '!platform/**/*.d.ts',
    '!platform/**/index.ts',
    '!platform/**/__tests__/**'
  ],
  verbose: true,
  testTimeout: 60000, // 60 seconden voor performance tests
  slowTestThreshold: 30000 // Markeer tests als 'slow' na 30 seconden
};