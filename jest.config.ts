/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
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
      branches: 40,
      functions: 40,
      lines: 45,
      statements: 45,
    },
  },
};
