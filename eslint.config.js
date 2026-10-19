// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'balance/*', 'design/*', 'tools/*', '.expo/*', '.claude/*'],
  },
  {
    // Економіка — чистий модуль (конституція, принцип II; 001 FR-1, AC-1)
    files: ['src/economy/**/*.ts', 'src/telegrams/**/*.ts', 'src/inspections/**/*.ts', 'src/race/**/*.ts', 'src/digitization/**/*.ts', 'src/museum/**/*.ts', 'src/monetization/**/*.ts'],
    ignores: ['src/economy/**/__tests__/**', 'src/telegrams/**/__tests__/**', 'src/inspections/**/__tests__/**', 'src/race/**/__tests__/**', 'src/digitization/**/__tests__/**', 'src/museum/**/__tests__/**', 'src/monetization/**/__tests__/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['react', 'react-native', 'react-native-mmkv', 'zustand'].map((name) => ({
            name,
            message: 'Модуль економіки чистий: без React, RN, сховища (FR-1).',
          })),
          patterns: [{ group: ['expo*', '@/features/*', '@/app/*'], message: 'Модуль економіки чистий (FR-1).' }],
        },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Date', property: 'now', message: 'Час приходить аргументом (FR-1).' },
        { object: 'Math', property: 'random', message: 'Seed приходить аргументом (FR-1).' },
      ],
    },
  },
]);
