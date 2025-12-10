module.exports = {
    testEnvironment: 'node',
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            tsconfig: 'tsconfig.json',
        }],
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    testMatch: ['**/__tests__/**/*.(ts|tsx|js)', '**/*.(test|spec).(ts|tsx|js)'],
    testPathIgnorePatterns: ['/node_modules/', '/ios/', '/android/'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
    },
};
