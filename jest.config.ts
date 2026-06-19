/** @type {import('ts-jest').JestConfigWithTsJest} */
const jestConfig = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  setupFiles: ['<rootDir>/jest.setup.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      diagnostics: false,
      useESM: true,
    }],
    '^.+\\.jsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      diagnostics: false,
      useESM: true,
    }],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!jose|otplib)/',
  ],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  collectCoverageFrom: [
    'src/lib/**/*.ts',
    'src/app/api/utils/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/types.ts',
  ],
  forceExit: true,
  detectOpenHandles: false,
  coverageThreshold: {
    // Global thresholds raised from 60/70/70/70 to 70/80/75/75 (m10).
    // Current coverage: 73% branches, 82% functions, 78% lines, 77% statements.
    // These thresholds catch regressions without being too strict.
    // Target: 80%+ global in a future iteration.
    global: {
      branches: 70,
      functions: 80,
      lines: 75,
      statements: 75,
    },
    // Stricter thresholds for security-critical modules
    './src/lib/auth/': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './src/app/api/utils/': {
      branches: 75,
      functions: 80,
      lines: 85,
      statements: 85,
    },
  },
};

export default jestConfig;
