import { setupEnvVars } from './common/env-setup';

// sets the env to be used in unit tests
process.env.CURRENT_ENV = 'test-unit';

// load env vars
setupEnvVars();
