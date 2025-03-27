/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
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
  globalSetup: '<rootDir>/src/v2/test/jest/setup.ts',
  globalTeardown: '<rootDir>/src/v2/test/jest/teardown.ts',
  setupFilesAfterEnv: ['<rootDir>/src/v2/test/jest/setup-after-env.ts'],
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
    'src/v2/**/*.ts',
    '!src/v2/**/*.d.ts',
    '!src/v2/**/index.ts',
    '!src/v2/**/__tests__/**',
    '!src/v2/test/**'
  ],
  verbose: true,
  testTimeout: 10000
};