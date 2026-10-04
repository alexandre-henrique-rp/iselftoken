module.exports = {
  rootDir: '../..',
  testEnvironment: 'node',
  testRegex: '/test/e2e/flows/.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  transformIgnorePatterns: ['node_modules/(?!(uuid)/)'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^@prisma/client$': '<rootDir>/node_modules/.prisma/client',
    '^@prisma$': '<rootDir>/node_modules/.prisma',
    '^@prisma/client-runtime-utils$':
      '<rootDir>/node_modules/.pnpm/@prisma+client-runtime-utils@7.8.0/node_modules/@prisma/client-runtime-utils',
    '^uuid$': '<rootDir>/jest.setup.ts',
  },
  testTimeout: 30000,
};
