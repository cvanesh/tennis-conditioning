#!/usr/bin/env node
// Decrypt utility - decrypts js/data-encrypted.js into js/data.js
// Usage: node decrypt-data.js
// You will be prompted for the password.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ENCRYPTED_FILE = path.join(__dirname, '..', 'js', 'data-encrypted.js');
const OUTPUT_FILE = path.join(__dirname, '..', 'js', 'data.js');

function askPassword() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Disable echo for password input
    if (process.stdin.isTTY) {
      process.stdout.write('Enter decryption password: ');
      const stdin = process.openStdin();
      process.stdin.on('data', (char) => {
        char = char.toString();
        if (char === '\n' || char === '\r' || char === '\r\n') {
          process.stdout.write('\n');
          rl.close();
          resolve(char.trim());
        }
      });
      process.stdin.setRawMode(true);
      process.stdin.resume();

      let password = '';
      process.stdin.removeAllListeners('data');
      process.stdin.on('data', (buf) => {
        const char = buf.toString();
        if (char === '\n' || char === '\r' || char === '\u0004') {
          process.stdin.setRawMode(false);
          process.stdout.write('\n');
          rl.close();
          resolve(password);
        } else if (char === '\u0003') {
          // Ctrl+C
          process.exit(1);
        } else if (char === '\u007f' || char === '\b') {
          // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
          }
        } else {
          password += char;
        }
      });
    } else {
      // Non-TTY (piped input)
      rl.question('Enter decryption password: ', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

async function decrypt() {
  // Read encrypted file
  if (!fs.existsSync(ENCRYPTED_FILE)) {
    console.error(`Error: ${ENCRYPTED_FILE} not found`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(ENCRYPTED_FILE, 'utf8');

  // Extract the base64 encrypted string
  const match = fileContent.match(/window\.ENCRYPTED_DATA\s*=\s*'([^']+)'/);
  if (!match) {
    console.error('Error: Could not find ENCRYPTED_DATA in file');
    process.exit(1);
  }

  const base64Data = match[1];
  const password = await askPassword();

  if (!password) {
    console.error('Error: No password provided');
    process.exit(1);
  }

  try {
    // Decode base64
    const encryptedData = Buffer.from(base64Data, 'base64');

    // Extract components (matches auth.js decryptData format)
    // Format: salt(16) || iv(12) || authTag(16) || ciphertext
    const salt = encryptedData.slice(0, 16);
    const iv = encryptedData.slice(16, 28);
    const authTag = encryptedData.slice(28, 44);
    const ciphertext = encryptedData.slice(44);

    // Derive key using PBKDF2 (same params as auth.js)
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

    // Decrypt with AES-256-GCM
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    // Parse JSON to validate and pretty-print
    const data = JSON.parse(decrypted.toString('utf8'));

    // Write as js/data.js with window globals (matches what auth.js sets after decryption)
    const output = `// Tennis Conditioning Data
// Decrypted from data-encrypted.js

window.DATA = ${JSON.stringify(data, null, 2)};

// Expose individual sections as globals (same as auth.js does after decryption)
window.EXERCISES = window.DATA.exercises;
window.WARMUP_PROTOCOL = window.DATA.warmup;
window.COOLDOWN_PROTOCOL = window.DATA.cooldown;
window.MATCH_DAY_PROTOCOL = window.DATA.matchDay;
window.NUTRITION_PLAN = window.DATA.nutrition;
window.EIGHT_WEEK_PROGRAM = window.DATA.eightWeek;
`;

    fs.writeFileSync(OUTPUT_FILE, output, 'utf8');
    console.log(`Successfully decrypted to ${OUTPUT_FILE}`);
    console.log(`Data contains keys: ${Object.keys(data).join(', ')}`);
  } catch (error) {
    if (error.message.includes('Unsupported state') || error.code === 'ERR_OSSL_EVP_BAD_DECRYPT') {
      console.error('Error: Invalid password or corrupted data');
    } else {
      console.error(`Error: ${error.message}`);
    }
    process.exit(1);
  }
}

decrypt();
