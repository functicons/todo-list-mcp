/**
 * run_tests.ts
 * 
 * Main test runner that executes all integration tests
 * with proper error handling and reporting.
 */
import { runAllTests } from './integration_tests.js';
import { runMigrationTests } from './migration_tests.js';
import { runConcurrentWriteTest } from './concurrent_write_test.js';

/**
 * Main test execution function
 */
async function main() {
  console.log('🚀 Starting Todo List MCP Integration Test Suite\n');
  
  const startTime = Date.now();
  let testsPassed = 0;
  let testsFailed = 0;
  
  try {
    console.log('📦 Running Data Store Integration Tests...');
    await runAllTests();
    console.log('✅ Data Store Integration Tests: PASSED\n');
    testsPassed++;
  } catch (error) {
    console.error('❌ Data Store Integration Tests: FAILED');
    console.error(error);
    console.log();
    testsFailed++;
  }
  
  try {
    console.log('🔄 Running Migration Tests...');
    await runMigrationTests();
    console.log('✅ Migration Tests: PASSED\n');
    testsPassed++;
  } catch (error) {
    console.error('❌ Migration Tests: FAILED');
    console.error(error);
    console.log();
    testsFailed++;
  }
  
  try {
    console.log('🔐 Running Concurrent Write Tests...');
    await runConcurrentWriteTest();
    console.log('✅ Concurrent Write Tests: PASSED\n');
    testsPassed++;
  } catch (error) {
    console.error('❌ Concurrent Write Tests: FAILED');
    console.error(error);
    console.log();
    testsFailed++;
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log('📊 Test Results Summary');
  console.log('========================');
  console.log(`✅ Test Suites Passed: ${testsPassed}`);
  console.log(`❌ Test Suites Failed: ${testsFailed}`);
  console.log(`⏱️  Total Duration: ${duration}ms`);
  console.log();
  
  if (testsFailed > 0) {
    console.log('❌ Some tests failed. Please check the output above for details.');
    process.exit(1);
  } else {
    console.log('🎉 All tests passed successfully!');
    console.log('🔒 Data integrity and functionality verified across all storage implementations.');
    process.exit(0);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run the tests
main().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});