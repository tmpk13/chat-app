const Sequencer = require('@jest/test-sequencer').default;

// Custom sequencer to run auth.test.js first, then other tests
class CustomSequencer extends Sequencer {
  sort(tests) {
    // Run auth middleware tests first
    return tests.sort((testA, testB) => {
      if (testA.path.includes('auth.test.js')) {
        return -1;
      }
      if (testB.path.includes('auth.test.js')) {
        return 1;
      }
      
      // Run socket tests last
      if (testA.path.includes('socket.test.js')) {
        return 1;
      }
      if (testB.path.includes('socket.test.js')) {
        return -1;
      }
      
      return 0;
    });
  }
}

module.exports = CustomSequencer;