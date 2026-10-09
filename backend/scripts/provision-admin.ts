import readline from 'node:readline';
import { Writable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { connectDatabase } from '../src/config/database.js';
import { User } from '../src/modules/users/user.model.js';

export interface ProvisionAdminInput {
  name: string;
  email: string;
  password: string;
}

export type ProvisionAdminResult =
  | { success: true; code: 'CREATED'; message: string; userId: string }
  | { success: false; code: 'ALREADY_ADMIN'; message: string }
  | { success: false; code: 'CONFLICT_EXISTING_USER'; message: string; existingRole: string }
  | { success: false; code: 'INVALID_INPUT'; message: string };

/**
 * Core admin provisioning logic separated from terminal I/O.
 * Safe to call from CLI or test suites without prompting or exiting process.
 */
export async function provisionAdminAccount(input: ProvisionAdminInput): Promise<ProvisionAdminResult> {
  const name = input.name?.trim();
  if (!name || name.length < 2) {
    return {
      success: false,
      code: 'INVALID_INPUT',
      message: 'Administrator name must be at least 2 characters.',
    };
  }

  const rawEmail = input.email?.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!rawEmail || !emailRegex.test(rawEmail)) {
    return {
      success: false,
      code: 'INVALID_INPUT',
      message: 'A valid email address is required.',
    };
  }

  const password = input.password;
  if (!password || password.length < 8) {
    return {
      success: false,
      code: 'INVALID_INPUT',
      message: 'Administrator password must be at least 8 characters long.',
    };
  }

  const existing = await User.findOne({ email: rawEmail });
  if (existing) {
    if (existing.role === 'admin') {
      return {
        success: false,
        code: 'ALREADY_ADMIN',
        message: `An administrator account with email "${rawEmail}" already exists. Password was not changed.`,
      };
    }
    return {
      success: false,
      code: 'CONFLICT_EXISTING_USER',
      message: `An existing account with role "${existing.role}" already uses this email. Refusing to overwrite or promote an existing account.`,
      existingRole: existing.role,
    };
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const newAdmin = await User.create({
    name,
    email: rawEmail,
    passwordHash,
    role: 'admin',
    bloodGroup: 'O+',
    district: 'Colombo',
    city: 'Colombo 07',
    isAvailable: false,
    isEligible: false,
    donationCount: 0,
  });

  return {
    success: true,
    code: 'CREATED',
    message: `Administrator account created successfully for "${rawEmail}".`,
    userId: newAdmin._id.toString(),
  };
}

/**
 * Prompts user for console input.
 * When hidden=true, terminal output is muted so typed characters are completely
 * hidden (no characters or asterisks are echoed) and passwords are never logged.
 */
function askQuestion(query: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    if (hidden) {
      const muted = true;
      const mutableStdout = new Writable({
        write(chunk, encoding, callback) {
          if (!muted) {
            process.stdout.write(chunk, encoding);
          }
          callback();
        },
      });

      const rl = readline.createInterface({
        input: process.stdin,
        output: mutableStdout,
        terminal: Boolean(process.stdin.isTTY),
      });

      rl.on('SIGINT', () => {
        rl.close();
        process.stdout.write('\n');
        process.exit(1);
      });

      process.stdout.write(query);

      rl.question('', (answer) => {
        rl.close();
        process.stdout.write('\n');
        resolve(answer.trim());
      });
    } else {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.on('SIGINT', () => {
        rl.close();
        process.stdout.write('\n');
        process.exit(1);
      });

      rl.question(query, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

export async function provisionAdminInteractively(): Promise<void> {
  if (!env.MONGODB_URI) {
    console.error('Error: MONGODB_URI is not configured in environment.');
    process.exit(1);
  }

  await connectDatabase(env.MONGODB_URI);

  try {
    console.log('--- LifeLine LK Administrator Provisioning ---');
    console.log('Provide administrator credentials below. Passwords are typed securely.\n');

    const name = await askQuestion('Admin Name: ');
    const rawEmail = await askQuestion('Admin Email: ');
    const password = await askQuestion('Password (min 8 chars): ', true);

    const result = await provisionAdminAccount({
      name,
      email: rawEmail,
      password,
    });

    if (result.code === 'ALREADY_ADMIN') {
      console.log(`Notice: ${result.message}`);
      return;
    }

    if (!result.success) {
      console.error(`Error: ${result.message}`);
      process.exit(1);
    }

    console.log(`\nSuccess: ${result.message}`);
  } finally {
    await mongoose.disconnect();
  }
}

// Execute interactive prompt ONLY when run directly as a script, never on import
const isDirectRun = Boolean(
  process.argv[1] &&
  (fileURLToPath(import.meta.url) === process.argv[1] ||
   process.argv[1].endsWith('provision-admin.ts') ||
   process.argv[1].endsWith('provision-admin.js'))
);

if (isDirectRun) {
  provisionAdminInteractively()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal error provisioning admin:', err);
      process.exit(1);
    });
}
