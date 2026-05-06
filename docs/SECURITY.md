# 🔐 Security & Password Protection Guide

This app includes advanced password protection and data encryption features to keep your workout data private.

## Overview

The security system uses **client-side AES-256 encryption** with password-derived keys (PBKDF2) to protect all workout, protocol, and nutrition data. Even if someone views the source code, they cannot access the content without the password.

## How It Works

1. **Encryption**: Data is encrypted using AES-256-GCM encryption
2. **Key Derivation**: Password is converted to encryption key using PBKDF2 (100,000 iterations)
3. **Storage**: Only encrypted data is stored in the repository
4. **Session Management**: Password required on first visit, then session maintained for 30 minutes
5. **Auto-Logout**: Automatic logout after 30 minutes of inactivity
6. **Memory Security**: Decrypted data exists only in memory, cleared on page close

## Setup Instructions

### Step 1: Encrypt Your Data

1. Open `encrypt-data.html` in your browser
2. Click "Select data.js file" and choose `js/data.js`
3. Enter a strong password (minimum 8 characters)
4. Confirm the password
5. Click "Encrypt Data"
6. Copy the generated encrypted content

### Step 2: Create Encrypted Data File

1. Create a new file: `js/data-encrypted.js`
2. Paste the encrypted content from Step 1
3. Save the file

### Step 3: Update index.html

Replace the data.js reference with data-encrypted.js:

```html
<!-- Change this -->
<script src="js/data.js"></script>

<!-- To this -->
<script src="js/data-encrypted.js"></script>
```

### Step 4: Remove Original Data

**IMPORTANT**: Delete or move the original `js/data.js` file to ensure unencrypted data is not deployed.

```bash
# Move to dev-tools for backup
mv js/data.js dev-tools/data.js.original

# Or delete completely (make sure you have a backup!)
rm js/data.js
```

### Step 5: Update Service Worker

Update `sw.js` to cache the encrypted data file:

```javascript
const STATIC_ASSETS = [
  // ... other files
  './js/data-encrypted.js',  // Add this
  // Remove: './js/data.js'
];
```

### Step 6: Test

1. Open the app in a browser
2. You should see a password prompt
3. Enter your password
4. Verify all features work correctly

## Password Management

### Choosing a Strong Password

- Minimum 8 characters (longer is better)
- Mix of uppercase, lowercase, numbers, and symbols
- Avoid common words or patterns
- Example: `T3nn!s_Pr0_2024`

### Storing Your Password

**CRITICAL**: You must securely store the password. If you lose it, you cannot decrypt the data!

Options:
- Use a password manager (recommended)
- Write it down and store in a secure physical location
- Share with trusted team members only

### Changing the Password

1. Decrypt data with current password
2. Re-encrypt with new password using `encrypt-data.html`
3. Replace `js/data-encrypted.js` with new encrypted version
4. Deploy updated file

## Security Features

### 1. Session Management

- **Auto-logout**: 30 minutes of inactivity
- **Session timeout**: Password required after browser close
- **Activity tracking**: Mouse, keyboard, touch events reset timer

### 2. Memory Protection

- Decrypted data stored only in memory
- Data cleared on:
  - Page unload
  - Tab close
  - Browser close
  - Manual logout
  - Session timeout

### 3. Error Handling

- Invalid password attempts don't reveal data
- Corrupted encrypted data handled gracefully
- No sensitive information in error messages

## Deployment Checklist

Before deploying to production:

- [ ] Data is encrypted with strong password
- [ ] Original `js/data.js` is removed from repository
- [ ] Service worker updated to cache `data-encrypted.js`
- [ ] Password stored securely (password manager recommended)
- [ ] Tested password login flow
- [ ] Tested session timeout (wait 30+ minutes)
- [ ] Tested auto-logout on inactivity
- [ ] Verified no unencrypted data in git history

### Cleaning Git History

If you accidentally committed unencrypted data:

```bash
# Remove sensitive file from all commits
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch js/data.js" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (WARNING: Rewrites history)
git push origin --force --all
```

## Limitations

### Important to Understand

This is **client-side encryption**, which means:

✅ **What it protects against:**
- Casual viewing of source code
- Unauthorized access to data files
- Data exposure in git repository
- Accidental data leaks

❌ **What it does NOT protect against:**
- Determined attackers with JavaScript debugging tools
- Browser memory inspection
- Compromised user devices
- Server-side attacks (if you add a backend)

### Best Use Cases

- Personal training data
- Small team/private use
- Training programs for clients
- Situations where casual privacy is sufficient

### When You Need More Security

For highly sensitive data or regulated industries, consider:
- Server-side authentication with database
- End-to-end encryption with user accounts
- Professional security audit
- HIPAA/GDPR compliant hosting

## Troubleshooting

### "Invalid password" Error

- Ensure you're using the correct password
- Check for typos (case-sensitive)
- Verify you're using the same password used for encryption

### Session Expires Too Quickly

Edit `js/auth.js`:
```javascript
this.sessionTimeout = 60 * 60 * 1000; // 60 minutes instead of 30
```

### Forgot Password

**Unfortunately, there is no recovery method.** You must:
1. Re-encrypt data with a new password using the original `data.js`
2. Update `data-encrypted.js`
3. Deploy new version

### Want to Disable Password Protection

To remove password protection:
1. Revert `index.html` to use `js/data.js` instead of `js/data-encrypted.js`
2. Deploy the unencrypted version
3. Remove or don't load `js/auth.js`

## Security Best Practices

1. **Regular Backups**: Keep encrypted and unencrypted backups secure
2. **Password Rotation**: Change password periodically
3. **Access Control**: Limit who knows the password
4. **Audit Logs**: Monitor access if possible
5. **HTTPS Only**: Always deploy with HTTPS (GitHub Pages does this automatically)
6. **Updates**: Keep browser and dependencies updated

## Questions or Issues?

For security concerns or questions, please:
- Review this documentation thoroughly
- Test in a development environment first
- Keep backups before making changes
- Document your password securely

---

**Remember**: The password is the only key to your data. Store it securely!
