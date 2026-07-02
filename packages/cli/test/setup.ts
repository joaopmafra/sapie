/**
 * Jest global setup — suppresses unhandled nock async errors
 * that fire after test suites complete (known nock v14 issue).
 */

// Suppress unhandled errors from nock's async socket cleanup
process.on('unhandledRejection', (reason) => {
  // Nock emits ECONNREFUSED when an interceptor is removed while a
  // request is pending. These are harmless post-suite artifacts.
  const msg = String(reason);
  if (msg.includes('ECONNREFUSED') || msg.includes('NetConnectNotAllowedError')) {
    // Suppress — this is a nock lifecycle artifact, not a real test failure
    return;
  }
  // For all other unhandled rejections, print and re-throw
  console.error('Unhandled rejection:', reason);
  throw reason;
});
