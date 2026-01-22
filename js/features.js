// Additional Features Module
// Screen Wake Lock, Audio Cues, Offline Indicator, Error Handling

class AppFeatures {
  constructor() {
    this.wakeLock = null;
    this.isWorkoutActive = false;
    this.audioContext = null;
    this.isOnline = navigator.onLine;

    this.init();
  }

  init() {
    this.initOfflineIndicator();
    this.initErrorHandling();
    this.initBeforeUnload();
  }

  // ===================================
  // SCREEN WAKE LOCK
  // ===================================

  async requestWakeLock() {
    if (!('wakeLock' in navigator)) {
      console.warn('Screen Wake Lock API not supported');
      return false;
    }

    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      console.log('Screen Wake Lock activated');

      // Re-request wake lock if page becomes visible again
      this.wakeLock.addEventListener('release', () => {
        console.log('Screen Wake Lock released');
      });

      // Re-acquire wake lock when page becomes visible
      document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible' && this.isWorkoutActive) {
          await this.requestWakeLock();
        }
      });

      return true;
    } catch (error) {
      console.error('Wake Lock request failed:', error);
      return false;
    }
  }

  releaseWakeLock() {
    if (this.wakeLock) {
      this.wakeLock.release();
      this.wakeLock = null;
      console.log('Screen Wake Lock manually released');
    }
  }

  // ===================================
  // AUDIO CUES
  // ===================================

  initAudio() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playBeep(frequency = 800, duration = 200, type = 'sine') {
    try {
      this.initAudio();

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      // Fade out to avoid click
      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration / 1000);
    } catch (error) {
      console.error('Audio playback failed:', error);
    }
  }

  // Different audio cues
  playSuccess() {
    this.playBeep(800, 150, 'sine');
    setTimeout(() => this.playBeep(1000, 150, 'sine'), 100);
  }

  playWarning() {
    this.playBeep(600, 200, 'square');
  }

  playComplete() {
    this.playBeep(600, 100, 'sine');
    setTimeout(() => this.playBeep(800, 100, 'sine'), 120);
    setTimeout(() => this.playBeep(1000, 200, 'sine'), 240);
  }

  playTimerTick() {
    this.playBeep(400, 50, 'sine');
  }

  // ===================================
  // OFFLINE INDICATOR
  // ===================================

  initOfflineIndicator() {
    // Create offline indicator
    const indicator = document.createElement('div');
    indicator.id = 'offlineIndicator';
    indicator.style.cssText = `
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      background: #FF9800;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 9999;
      display: none;
      align-items: center;
      gap: 8px;
    `;
    indicator.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="1" y1="1" x2="23" y2="23"></line>
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
        <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
        <line x1="12" y1="20" x2="12.01" y2="20"></line>
      </svg>
      <span>Offline Mode</span>
    `;
    document.body.appendChild(indicator);

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      indicator.style.display = 'none';
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      indicator.style.display = 'flex';
    });

    // Show if currently offline
    if (!navigator.onLine) {
      indicator.style.display = 'flex';
    }
  }

  // ===================================
  // ERROR HANDLING
  // ===================================

  initErrorHandling() {
    // Global error handler
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.showError('An unexpected error occurred. Please refresh the page.');
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled rejection:', event.reason);
      this.showError('An error occurred while processing your request.');
    });
  }

  // Check and handle localStorage corruption
  checkLocalStorage() {
    try {
      const testKey = '__test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.error('localStorage is not available or corrupted:', error);
      return false;
    }
  }

  // Recover from corrupted localStorage
  handleCorruptedStorage() {
    try {
      // Clear all localStorage
      localStorage.clear();
      sessionStorage.clear();

      this.showError(
        'Your saved data was corrupted and has been reset. Please log in again.',
        true
      );
    } catch (error) {
      this.showError(
        'Unable to access device storage. Please check browser settings and try again.',
        true
      );
    }
  }

  // Validate exercise data
  validateExerciseData(exercises) {
    if (!exercises || typeof exercises !== 'object') {
      throw new Error('Invalid exercise data format');
    }

    // Check for required properties
    const requiredKeys = ['exercises', 'warmup', 'cooldown', 'matchDay', 'nutrition', 'eightWeek'];
    for (const key of requiredKeys) {
      if (!(key in exercises)) {
        throw new Error(`Missing required data: ${key}`);
      }
    }

    return true;
  }

  // Handle missing exercise data
  handleMissingData(dataType) {
    this.showError(
      `Unable to load ${dataType} data. Some features may not be available.`,
      false
    );
  }

  // Show error message to user
  showError(message, requireReload = false) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 400px;
      width: 90%;
    `;

    errorDiv.innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <h3 style="margin: 0 0 12px 0; color: #D32F2F;">Error</h3>
        <p style="margin: 0 0 20px 0; color: #666; line-height: 1.5;">${message}</p>
        <button
          onclick="window.location.reload()"
          style="
            background: #2E7D32;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
          "
        >
          ${requireReload ? 'Reload Page' : 'OK'}
        </button>
      </div>
    `;

    document.body.appendChild(errorDiv);

    // Auto-reload if required
    if (requireReload) {
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } else {
      // Remove error after button click
      errorDiv.querySelector('button').addEventListener('click', () => {
        errorDiv.remove();
      });
    }
  }

  // ===================================
  // WORKOUT CONFIRMATION
  // ===================================

  initBeforeUnload() {
    window.addEventListener('beforeunload', (event) => {
      if (this.isWorkoutActive) {
        event.preventDefault();
        event.returnValue = 'You have an active workout. Are you sure you want to leave?';
        return event.returnValue;
      }
    });
  }

  setWorkoutActive(active) {
    this.isWorkoutActive = active;

    if (active) {
      this.requestWakeLock();
    } else {
      this.releaseWakeLock();
    }
  }

  confirmLeaveWorkout() {
    return new Promise((resolve) => {
      if (!this.isWorkoutActive) {
        resolve(true);
        return;
      }

      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      `;

      modal.innerHTML = `
        <div style="
          background: white;
          border-radius: 8px;
          padding: 24px;
          max-width: 400px;
          width: 90%;
        ">
          <h3 style="margin: 0 0 12px 0;">Leave Workout?</h3>
          <p style="margin: 0 0 20px 0; color: #666;">
            You have an active workout in progress. Your progress will be saved, but the timer will be reset.
          </p>
          <div style="display: flex; gap: 12px;">
            <button id="confirmCancel" style="
              flex: 1;
              padding: 12px;
              background: #f5f5f5;
              border: none;
              border-radius: 4px;
              font-size: 16px;
              cursor: pointer;
            ">Cancel</button>
            <button id="confirmLeave" style="
              flex: 1;
              padding: 12px;
              background: #D32F2F;
              color: white;
              border: none;
              border-radius: 4px;
              font-size: 16px;
              cursor: pointer;
            ">Leave</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      document.getElementById('confirmCancel').addEventListener('click', () => {
        modal.remove();
        resolve(false);
      });

      document.getElementById('confirmLeave').addEventListener('click', () => {
        modal.remove();
        this.setWorkoutActive(false);
        resolve(true);
      });
    });
  }
}

// Export features instance
window.AppFeatures = new AppFeatures();
