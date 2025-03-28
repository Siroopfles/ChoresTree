const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const prettier = require('eslint-plugin-prettier');
const jest = require('eslint-plugin-jest');

const baseConfig = {
  plugins: {
    '@typescript-eslint': tseslint,
    'prettier': prettier,
  },
  languageOptions: {
    parser: tsparser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      project: './tsconfig.platform.json',
      tsconfigRootDir: __dirname,
    },
  },
};

module.exports = [
  {
    ...baseConfig,
    files: ['platform/**/*.ts'],
    ignores: ['**/Old/**', '**/*.test.ts', '**/__tests__/**'],
    rules: {
      // TypeScript specifieke regels
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      // Algemene code kwaliteit
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'prettier/prettier': 'error',
    }
  },
  {
    ...baseConfig,
    files: ['platform/**/*.test.ts', 'platform/**/__tests__/**/*.ts'],
    languageOptions: {
      ...baseConfig.languageOptions,
      parserOptions: {
        ...baseConfig.languageOptions.parserOptions,
        project: './tsconfig.test.json',
      },
    },
    plugins: {
      ...baseConfig.plugins,
      'jest': jest,
    },
    rules: {
      // Test specifieke regels
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'jest/valid-expect': 'error',
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/no-identical-title': 'error',
      'jest/prefer-to-have-length': 'warn',
      'jest/prefer-expect-assertions': 'warn',
    }
  }
];