module.exports = {
    testEnvironment: 'node',
    testTimeout: 10000,
    setupFilesAfterEnv: ['./jest.setup.js'],
    verbose: true,
    forceExit: true,
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true
};