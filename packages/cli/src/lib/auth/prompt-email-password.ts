import * as readline from 'readline';

/**
 * Prompt for email and password via stdin.
 * Extracted so both `init` and `login` commands reuse the same logic.
 */
export function promptEmailPassword(): Promise<{ email: string; password: string }> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Email: ', (email) => {
      rl.question('Password: ', (password) => {
        rl.close();
        resolve({ email, password });
      });
    });
  });
}
