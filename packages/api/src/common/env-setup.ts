import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'node:fs';

/**
 * Sets up environment variables from .env files.
 */
export function setupEnvVars() {
  // The FIREBASE_CONFIG env var is set either by the Firebase CLI when running on the emulator or by the Firebase
  // Runtime when running on the cloud, so we can use it to determine whether we're running on Firebase or on other
  // environments (like local-dev or test-unit)
  const isFirebaseEmulatorOrCloud = !!process.env.FIREBASE_CONFIG;

  // If running on Firebase cloud or emulator, load the .env file from the project's parent directory. Otherwise,
  // load from the project's root directory.
  const basePath = isFirebaseEmulatorOrCloud ? '../' : '../..';

  const envFilePath = path.resolve(__dirname, basePath, `.env.${process.env.CURRENT_ENV}`);
  if (!fs.existsSync(envFilePath)) throw new Error(`env file not found: ${envFilePath}`);

  dotenv.config({ path: envFilePath, quiet: process.env.CURRENT_ENV === 'test-unit' });
}
