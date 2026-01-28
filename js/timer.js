// Timer Management for Tennis Conditioning App
// Handles exercise timers, rest timers, and progress tracking

class Timer {
  constructor() {
    this.duration = 0; // Total duration in seconds
    this.remaining = 0; // Remaining time in seconds
    this.interval = null;
    this.isRunning = false;
    this.isPaused = false;
    this.type = 'exercise'; // 'exercise' or 'rest'
    this.onTick = null; // Callback for each second
    this.onComplete = null; // Callback when timer completes
    this.onStart = null; // Callback when timer starts
    this.onPause = null; // Callback when timer pauses
    this.startTime = null;
    this.pausedTime = 0;
  }

  // Start or resume the timer
  start(duration = null) {
    if (duration !== null) {
      this.duration = duration;
      this.remaining = duration;
    }

    if (this.remaining <= 0) {
      this.remaining = this.duration;
    }

    this.isRunning = true;
    this.isPaused = false;
    this.startTime = Date.now() - (this.duration - this.remaining) * 1000;

    if (this.onStart) {
      this.onStart();
    }

    this.interval = setInterval(() => {
      this.tick();
    }, 1000);

    // Immediate tick
    this.tick();
  }

  // Pause the timer
  pause() {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.isPaused = true;
    this.pausedTime = Date.now();

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    if (this.onPause) {
      this.onPause();
    }
  }

  // Resume from pause
  resume() {
    if (!this.isPaused) return;
    this.start();
  }

  // Stop and reset the timer
  stop() {
    this.isRunning = false;
    this.isPaused = false;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.remaining = this.duration;
    this.startTime = null;
    this.pausedTime = 0;

    if (this.onTick) {
      this.onTick(this.remaining, this.duration);
    }
  }

  // Reset timer to initial duration
  reset() {
    this.stop();
    this.remaining = this.duration;

    if (this.onTick) {
      this.onTick(this.remaining, this.duration);
    }
  }

  // Tick function called every second
  tick() {
    if (!this.isRunning) return;

    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    this.remaining = Math.max(0, this.duration - elapsed);

    // Call tick callback
    if (this.onTick) {
      this.onTick(this.remaining, this.duration);
    }

    // Check if completed
    if (this.remaining <= 0) {
      this.complete();
    }
  }

  // Complete the timer
  complete() {
    this.stop();

    // Play completion sound/vibration if enabled
    this.playCompletionFeedback();

    // Call completion callback
    if (this.onComplete) {
      this.onComplete();
    }
  }

  // Set timer type
  setType(type) {
    this.type = type;
  }

  // Get formatted time string (MM:SS)
  getFormattedTime(seconds = null) {
    const time = seconds !== null ? seconds : this.remaining;
    const mins = Math.floor(time / 60);
    const secs = time % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  // Get progress percentage
  getProgress() {
    if (this.duration === 0) return 0;
    const elapsed = this.duration - this.remaining;
    return Math.min(100, (elapsed / this.duration) * 100);
  }

  // Play completion feedback (sound/vibration)
  playCompletionFeedback() {
    const settings = Storage.getSettings();

    // Vibration
    if (settings.vibrateEnabled && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    // Sound (using Web Audio API for a simple beep)
    if (settings.soundEnabled && 'AudioContext' in window) {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Resume audio context if suspended (required for iOS and some browsers)
        if (audioContext.state === 'suspended') {
          audioContext.resume().then(() => {
            this.playBeep(audioContext);
          }).catch(error => {
            console.log('Failed to resume audio context:', error);
          });
        } else {
          this.playBeep(audioContext);
        }
      } catch (error) {
        console.log('Audio playback not supported:', error);
      }
    }
  }

  // Helper method to play the beep sound
  playBeep(audioContext) {
    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.log('Failed to play beep:', error);
    }
  }

  // Check if timer is running
  isActive() {
    return this.isRunning;
  }

  // Get remaining time
  getRemaining() {
    return this.remaining;
  }

  // Get total duration
  getDuration() {
    return this.duration;
  }
}

// Timer Manager - Manages multiple timers for exercises and rest periods
class TimerManager {
  constructor() {
    this.exerciseTimer = new Timer();
    this.restTimer = new Timer();
    this.currentTimer = null;
    this.autoStartRest = true;
  }

  // Start exercise timer
  startExercise(duration, callbacks = {}) {
    this.stopAll();

    this.exerciseTimer.setType('exercise');
    this.exerciseTimer.duration = duration;
    this.exerciseTimer.onTick = callbacks.onTick || null;
    this.exerciseTimer.onComplete = callbacks.onComplete || (() => {
      if (this.autoStartRest && callbacks.restDuration) {
        this.startRest(callbacks.restDuration, callbacks.restCallbacks);
      }
    });
    this.exerciseTimer.onStart = callbacks.onStart || null;
    this.exerciseTimer.onPause = callbacks.onPause || null;

    this.exerciseTimer.start(duration);
    this.currentTimer = 'exercise';

    return this.exerciseTimer;
  }

  // Start rest timer
  startRest(duration, callbacks = {}) {
    this.stopAll();

    this.restTimer.setType('rest');
    this.restTimer.duration = duration;
    this.restTimer.onTick = callbacks.onTick || null;
    this.restTimer.onComplete = callbacks.onComplete || null;
    this.restTimer.onStart = callbacks.onStart || null;
    this.restTimer.onPause = callbacks.onPause || null;

    this.restTimer.start(duration);
    this.currentTimer = 'rest';

    return this.restTimer;
  }

  // Pause current timer
  pause() {
    if (this.currentTimer === 'exercise') {
      this.exerciseTimer.pause();
    } else if (this.currentTimer === 'rest') {
      this.restTimer.pause();
    }
  }

  // Resume current timer
  resume() {
    if (this.currentTimer === 'exercise') {
      this.exerciseTimer.resume();
    } else if (this.currentTimer === 'rest') {
      this.restTimer.resume();
    }
  }

  // Stop current timer
  stop() {
    if (this.currentTimer === 'exercise') {
      this.exerciseTimer.stop();
    } else if (this.currentTimer === 'rest') {
      this.restTimer.stop();
    }
    this.currentTimer = null;
  }

  // Stop all timers
  stopAll() {
    this.exerciseTimer.stop();
    this.restTimer.stop();
    this.currentTimer = null;
  }

  // Reset current timer
  reset() {
    if (this.currentTimer === 'exercise') {
      this.exerciseTimer.reset();
    } else if (this.currentTimer === 'rest') {
      this.restTimer.reset();
    }
  }

  // Get active timer
  getActiveTimer() {
    if (this.currentTimer === 'exercise') return this.exerciseTimer;
    if (this.currentTimer === 'rest') return this.restTimer;
    return null;
  }

  // Check if any timer is running
  isAnyRunning() {
    return this.exerciseTimer.isActive() || this.restTimer.isActive();
  }

  // Get current timer type
  getCurrentType() {
    return this.currentTimer;
  }

  // Toggle auto-start rest
  setAutoStartRest(enabled) {
    this.autoStartRest = enabled;
  }
}

// Countdown Timer for display
class CountdownDisplay {
  constructor(containerElement) {
    this.container = containerElement;
    this.timer = null;
  }

  // Create timer HTML structure
  createTimerHTML(type = 'exercise') {
    const isRest = type === 'rest';
    const timerClass = isRest ? 'rest-timer' : 'timer-section';

    return `
      <div class="${timerClass}">
        <div class="timer-display">
          <div class="timer-time">00:00</div>
          <div class="timer-label">${isRest ? 'Rest Time' : 'Exercise Time'}</div>
        </div>
        <div class="timer-controls">
          <button class="timer-btn start" data-action="start">▶</button>
          <button class="timer-btn pause hidden" data-action="pause">⏸</button>
          <button class="timer-btn reset" data-action="reset">↻</button>
        </div>
        <div class="timer-progress">
          <div class="timer-progress-bar" style="width: 0%"></div>
        </div>
      </div>
    `;
  }

  // Update display
  update(remaining, duration) {
    const timeDisplay = this.container.querySelector('.timer-time');
    const progressBar = this.container.querySelector('.timer-progress-bar');

    if (timeDisplay) {
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      timeDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    if (progressBar) {
      const progress = duration > 0 ? ((duration - remaining) / duration) * 100 : 0;
      progressBar.style.width = `${progress}%`;
    }
  }

  // Show running state
  showRunning() {
    const startBtn = this.container.querySelector('[data-action="start"]');
    const pauseBtn = this.container.querySelector('[data-action="pause"]');

    if (startBtn) startBtn.classList.add('hidden');
    if (pauseBtn) pauseBtn.classList.remove('hidden');
  }

  // Show paused state
  showPaused() {
    const startBtn = this.container.querySelector('[data-action="start"]');
    const pauseBtn = this.container.querySelector('[data-action="pause"]');

    if (startBtn) startBtn.classList.remove('hidden');
    if (pauseBtn) pauseBtn.classList.add('hidden');
  }

  // Attach timer instance
  attachTimer(timer) {
    this.timer = timer;

    // Setup callbacks
    timer.onTick = (remaining, duration) => {
      this.update(remaining, duration);
    };

    timer.onStart = () => {
      this.showRunning();
    };

    timer.onPause = () => {
      this.showPaused();
    };

    // Setup button event listeners
    const startBtn = this.container.querySelector('[data-action="start"]');
    const pauseBtn = this.container.querySelector('[data-action="pause"]');
    const resetBtn = this.container.querySelector('[data-action="reset"]');

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (timer.isPaused) {
          timer.resume();
        } else {
          timer.start();
        }
      });
    }

    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        timer.pause();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        timer.reset();
        this.showPaused();
      });
    }

    // Initial display
    this.update(timer.duration, timer.duration);
  }
}

// Utility functions for time conversion
const TimeUtils = {
  // Convert seconds to MM:SS format
  formatSeconds(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  },

  // Convert MM:SS string to seconds
  parseTimeString(timeString) {
    const parts = timeString.split(':');
    if (parts.length === 2) {
      const mins = parseInt(parts[0], 10);
      const secs = parseInt(parts[1], 10);
      return mins * 60 + secs;
    }
    return 0;
  },

  // Convert minutes to seconds
  minutesToSeconds(minutes) {
    return minutes * 60;
  },

  // Convert seconds to minutes
  secondsToMinutes(seconds) {
    return Math.floor(seconds / 60);
  }
};
