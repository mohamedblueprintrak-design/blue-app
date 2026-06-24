/** @type {import('ts-jest').JestConfigWithTsJest} */
const jestConfig = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  setupFiles: ['<rootDir>/jest.setup.ts'],
  globalTeardown: '<rootDir>/jest.globalTeardown.ts',
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
    'src/app/api/**/route.ts',
    '!src/**/*.d.ts',
    '!src/**/types.ts',
  ],
  // SECURITY/QUALITY: forceExit:false + detectOpenHandles:true surfaces real
  // resource leaks (Prisma/Redis/BullMQ connections, dangling timers) as
  // warnings instead of silently killing them. The jest.globalTeardown.ts
  // file disconnects Prisma/Redis after all suites finish, so the process
  // can exit naturally. If a leak is introduced, Jest will report it and
  // the test run will hang — which is the desired behavior (forces a fix).
  forceExit: false,
  detectOpenHandles: true,
  coverageThreshold: {
    // Global thresholds (m10).
    // CI coverage: 67% branches, 75% functions, 71% lines, 70% statements.
    // Local coverage is higher (73/82/78/77) but CI is the source of truth.
    // Thresholds set slightly below CI numbers to avoid flakiness.
    // Target: raise to 80%+ in a future iteration by adding more tests.
    global: {
      branches: 65,
      functions: 70,
      lines: 68,
      statements: 68,
    },
    // Stricter thresholds for security-critical modules
    './src/lib/auth/': {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/app/api/utils/': {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80,
    },
  },
};

export default jestConfig;
