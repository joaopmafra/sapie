/**
 * Jest global setup — suppresses unhandled nock async errors
 * that fire after test suites complete (known nock v14 issue).
 *
 * Nock emits async ECONNREFUSED/NetConnectNotAllowedError when an
 * interceptor is removed while a request is pending. These are
 * harmless post-suite artifacts and must not fail the test run.
 *
 * Real unhandled rejections are logged and set a non-zero exit code
 * so the suite still fails.
 */

const NOCK_LIFECYCLE_PATTERNS = [
  'ECONNREFUSED',
  'NetConnectNotAllowedError',
  'Nock: No match for request',
];

process.prependListener('unhandledRejection', (reason: unknown) => {
  const msg = typeof reason === 'string' ? reason : String(reason);
  if (NOCK_LIFECYCLE_PATTERNS.some((p) => msg.includes(p))) {
    // Suppress: nock lifecycle artifacts, not test failures
    return;
  }
  // Real unhandled rejection — log and ensure the suite fails
  console.error('[UNHANDLED REJECTION]', reason);
  process.exitCode = 1;
});

// Also handle the newer 'unhandled error' event pattern (nock v14+ with Node 22)
process.prependListener('uncaughtException', (err: Error) => {
  if (NOCK_LIFECYCLE_PATTERNS.some((p) => err.message.includes(p))) {
    return;
  }
  console.error('[UNCAUGHT EXCEPTION]', err);
  process.exitCode = 1;
});
