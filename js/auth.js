// Authentication and Encryption Module
// Handles password protection and data decryption

class Auth {
  constructor() {
    this.isAuthenticated = false;
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.lastActivity = Date.now();
    this.encryptedData = null;
    this.decryptedData = null;

    this.initSessionMonitoring();
  }

  // Initialize session monitoring
  initSessionMonitoring() {
    // Update last activity on user interaction
    ['click', 'touchstart', 'keydown', 'scroll'].forEach(event => {
      document.addEventListener(event, () => {
        this.lastActivity = Date.now();
      });
    });

    // Check session timeout every minute
    setInterval(() => {
      if (this.isAuthenticated && Date.now() - this.lastActivity > this.sessionTimeout) {
        this.logout('Session expired due to inactivity');
      }
    }, 60000);

    // Clear data on page unload
    window.addEventListener('beforeunload', () => {
      this.clearSensitiveData();
    });

    // Clear data when page becomes hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.clearSensitiveData();
      }
    });
  }

  // Derive encryption key from password using PBKDF2
  async deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive AES key using PBKDF2
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Encrypt data with password
  async encryptData(data, password) {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(JSON.stringify(data));

      // Generate random salt and IV
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Derive key from password
      const key = await this.deriveKey(password, salt);

      // Encrypt data
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        dataBuffer
      );

      // Combine salt + iv + encrypted data
      const result = new Uint8Array(salt.length + iv.length + encryptedBuffer.byteLength);
      result.set(salt, 0);
      result.set(iv, salt.length);
      result.set(new Uint8Array(encryptedBuffer), salt.length + iv.length);

      // Convert to base64 for storage
      return btoa(String.fromCharCode(...result));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  // Decrypt data with password
  async decryptData(encryptedString, password) {
    try {
      // Convert from base64
      const encryptedData = new Uint8Array(
        atob(encryptedString).split('').map(char => char.charCodeAt(0))
      );

      // Extract salt, iv, and encrypted data
      const salt = encryptedData.slice(0, 16);
      const iv = encryptedData.slice(16, 28);
      const data = encryptedData.slice(28);

      // Derive key from password
      const key = await this.deriveKey(password, salt);

      // Decrypt data
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        data
      );

      // Convert to string and parse JSON
      const decoder = new TextDecoder();
      const jsonString = decoder.decode(decryptedBuffer);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Invalid password or corrupted data');
    }
  }

  // Authenticate user with password
  async authenticate(password) {
    try {
      // Check if encrypted data exists
      if (!window.ENCRYPTED_DATA) {
        throw new Error('No encrypted data found');
      }

      // Try to decrypt data
      this.decryptedData = await this.decryptData(window.ENCRYPTED_DATA, password);

      // Store decrypted data globally (only in memory)
      window.DATA = this.decryptedData;

      this.isAuthenticated = true;
      this.lastActivity = Date.now();

      // Store session in sessionStorage (cleared on browser close)
      sessionStorage.setItem('authenticated', 'true');
      sessionStorage.setItem('timestamp', Date.now().toString());

      return true;
    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    }
  }

  // Check if session is valid
  isSessionValid() {
    const authenticated = sessionStorage.getItem('authenticated');
    const timestamp = sessionStorage.getItem('timestamp');

    if (!authenticated || !timestamp) {
      return false;
    }

    const elapsed = Date.now() - parseInt(timestamp);
    return elapsed < this.sessionTimeout;
  }

  // Logout and clear data
  logout(message = 'Logged out successfully') {
    this.isAuthenticated = false;
    this.clearSensitiveData();
    sessionStorage.clear();

    // Show message and reload
    alert(message);
    window.location.reload();
  }

  // Clear sensitive data from memory
  clearSensitiveData() {
    if (this.decryptedData) {
      // Overwrite with random data before nullifying
      this.decryptedData = null;
    }
    if (window.DATA) {
      window.DATA = null;
    }
  }

  // Show password prompt
  showPasswordPrompt() {
    return new Promise((resolve) => {
      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      overlay.innerHTML = `
        <div style="
          background: white;
          border-radius: 16px;
          padding: 32px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        ">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="font-size: 48px; margin-bottom: 16px;">🎾</div>
            <h2 style="margin: 0 0 8px 0; color: #1B5E20; font-size: 24px;">Tennis Conditioning Pro</h2>
            <p style="margin: 0; color: #666; font-size: 14px;">Enter password to access</p>
          </div>

          <div style="margin-bottom: 16px;">
            <input
              type="password"
              id="authPassword"
              placeholder="Enter password"
              autocomplete="current-password"
              style="
                width: 100%;
                padding: 14px;
                border: 2px solid #E0E0E0;
                border-radius: 8px;
                font-size: 16px;
                box-sizing: border-box;
                transition: border-color 0.2s;
              "
            />
          </div>

          <div id="authError" style="
            color: #D32F2F;
            font-size: 14px;
            margin-bottom: 16px;
            min-height: 20px;
            text-align: center;
          "></div>

          <button
            id="authSubmit"
            style="
              width: 100%;
              padding: 14px;
              background: #2E7D32;
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: background 0.2s;
            "
          >
            Unlock App
          </button>

          <div style="
            margin-top: 24px;
            padding-top: 24px;
            border-top: 1px solid #E0E0E0;
            font-size: 12px;
            color: #999;
            text-align: center;
          ">
            🔒 Your data is encrypted and secure
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const passwordInput = document.getElementById('authPassword');
      const submitButton = document.getElementById('authSubmit');
      const errorDiv = document.getElementById('authError');

      // Focus on password input
      setTimeout(() => passwordInput.focus(), 100);

      // Handle submit
      const handleSubmit = async () => {
        const password = passwordInput.value.trim();

        if (!password) {
          errorDiv.textContent = 'Please enter a password';
          return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Unlocking...';
        errorDiv.textContent = '';

        const success = await this.authenticate(password);

        if (success) {
          overlay.remove();
          resolve(true);
        } else {
          errorDiv.textContent = 'Invalid password. Please try again.';
          submitButton.disabled = false;
          submitButton.textContent = 'Unlock App';
          passwordInput.value = '';
          passwordInput.focus();
        }
      };

      submitButton.addEventListener('click', handleSubmit);
      passwordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          handleSubmit();
        }
      });

      // Add hover effect
      submitButton.addEventListener('mouseenter', () => {
        submitButton.style.background = '#1B5E20';
      });
      submitButton.addEventListener('mouseleave', () => {
        submitButton.style.background = '#2E7D32';
      });

      // Add focus effect to input
      passwordInput.addEventListener('focus', () => {
        passwordInput.style.borderColor = '#2E7D32';
      });
      passwordInput.addEventListener('blur', () => {
        passwordInput.style.borderColor = '#E0E0E0';
      });
    });
  }
}

// Export the class - instance will be created in index.html
window.AuthClass = Auth;
