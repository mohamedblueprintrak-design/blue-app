/** @type {import('ts-jest').JestConfigWithTsJest} */
const jestConfig = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
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
    'src/app/api/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/types.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 65,
      lines: 70,
      statements: 70,
    },
    // Stricter thresholds for security-critical modules
    './src/lib/auth/': {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80,
    },
    './src/app/api/utils/': {
      branches: 65,
      functions: 70,
      lines: 75,
      statements: 75,
    },
  },
};

export default jestConfig;
