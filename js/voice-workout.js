// Voice-Guided Workout System
// Handles speech synthesis, audio feedback, and guided workout flow

// ===================================
// VOICE GUIDE MANAGER
// ===================================

class VoiceGuideManager {
  constructor() {
    this.synthesis = window.speechSynthesis;
    this.currentUtterance = null;
    this.enabled = true;
    this.voice = null;
    this.rate = 0.9; // User preference: Rishi voice
    this.pitch = 1.0;
    this.volume = 1.0;

    // Initialize voice
    this.initVoice();
  }

  // Initialize and select voice
  initVoice() {
    if (!this.synthesis) {
      console.warn('Speech synthesis not supported');
      return;
    }

    // Load voices (may need to wait for voiceschanged event)
    const loadVoices = () => {
      const voices = this.synthesis.getVoices();

      // Try to find user's preferred voice: Rishi
      this.voice = voices.find(v => v.name === 'Rishi');

      // Fallback to English voices
      if (!this.voice) {
        this.voice = voices.find(v => v.lang.startsWith('en-')) || voices[0];
      }

      if (!this.voice && voices.length > 0) {
        this.voice = voices[0];
      }

      if (this.voice) {
        console.log('[VoiceGuide] Using voice:', this.voice.name, '|', this.voice.lang);
      }
    };

    loadVoices();

    // Some browsers load voices asynchronously
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = loadVoices;
    }
  }

  // Low-level speak function
  speak(text, options = {}) {
    if (!this.enabled || !this.synthesis) {
      console.log('[Voice]', text);
      return Promise.resolve();
    }

    // Cancel any ongoing speech
    this.cancel();

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);

      // Set voice properties
      utterance.voice = this.voice;
      utterance.rate = options.rate || this.rate;
      utterance.pitch = options.pitch || this.pitch;
      utterance.volume = options.volume || this.volume;

      // Event handlers
      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (event) => {
        console.warn('Speech synthesis error (non-critical):', event.error || event.type);
        this.currentUtterance = null;
        // Don't reject - just resolve to continue workout
        resolve();
      };

      this.currentUtterance = utterance;

      // Wrap speak() call in try-catch for extra safety
      try {
        this.synthesis.speak(utterance);
      } catch (error) {
        console.warn('Failed to start speech synthesis:', error);
        resolve();
      }
    });
  }

  // Cancel current speech
  cancel() {
    if (this.synthesis && this.synthesis.speaking) {
      this.synthesis.cancel();
    }
    this.currentUtterance = null;
  }

  // Check if currently speaking
  isSpeaking() {
    return this.synthesis && this.synthesis.speaking;
  }

  // Enable/disable voice guidance
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.cancel();
    }
  }

  // ===================================
  // WORKOUT ANNOUNCEMENTS
  // ===================================

  // Announce section start
  announceSection(sectionName) {
    return this.speak(`Starting ${sectionName}`);
  }

  // Announce exercise with number
  async announceExercise(exerciseName, currentNumber, totalNumber) {
    await this.speak(`Exercise ${currentNumber} of ${totalNumber}`);
    await this.wait(400); // Pause before exercise name
    return this.speak(exerciseName);
  }

  // Announce exercise instructions (reps/duration + brief instructions)
  async announceInstructions(exercise) {
    let parts = [];

    // Add duration/reps/sets
    if (exercise.duration || exercise.time) {
      parts.push(exercise.duration || exercise.time);
    }
    if (exercise.reps) {
      parts.push(exercise.reps);
    }
    if (exercise.sets) {
      parts.push(exercise.sets);
    }

    // Speak each part with pauses
    for (const part of parts) {
      await this.speak(part);
      await this.wait(300);
    }

    // Add brief instructions
    if (exercise.instructions) {
      await this.wait(400);
      return this.speak(exercise.instructions);
    } else if (exercise.description) {
      // Use first sentence of description as brief instruction
      const firstSentence = exercise.description.split('.')[0];
      if (firstSentence) {
        await this.wait(400);
        return this.speak(firstSentence);
      }
    }
  }

  // Announce full description during exercise
  announceDescription(exercise) {
    if (exercise.description) {
      return this.speak(exercise.description);
    }
    return Promise.resolve();
  }

  // Announce countdown (5, 4, 3, 2, 1, Go!)
  async announceCountdown(seconds = 5) {
    for (let i = seconds; i > 0; i--) {
      await this.speak(String(i), { rate: 1.0 });
      await this.wait(800); // Short pause between numbers
    }
    await this.speak('Go!', { rate: 1.2 });
  }

  // Announce progress
  announceProgress(currentExercise, totalExercises) {
    return this.speak(`Exercise ${currentExercise} of ${totalExercises}`);
  }

  // Announce section complete
  announceSectionComplete(sectionName, nextSectionName = null) {
    let text = `${sectionName} complete.`;
    if (nextSectionName) {
      text += ` Moving to ${nextSectionName}.`;
    }
    return this.speak(text);
  }

  // Announce workout complete
  announceWorkoutComplete() {
    return this.speak('Workout complete! Great job!', { rate: 0.9 });
  }

  // Announce pause
  announcePause() {
    return this.speak('Workout paused');
  }

  // Announce resume
  announceResume() {
    return this.speak('Resuming');
  }

  // Announce time elapsed
  announceTimeElapsed(minutes) {
    return this.speak(`${minutes} minutes elapsed`);
  }

  // Wait utility
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ===================================
// AUDIO MANAGER (Beeps & Countdown)
// ===================================

class AudioManager {
  constructor() {
    this.audioContext = null;
    this.enabled = true;

    // Initialize audio context on user interaction
    this.initAudioContext();
  }

  // Initialize Web Audio API context
  initAudioContext() {
    if ('AudioContext' in window || 'webkitAudioContext' in window) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } else {
      console.warn('Web Audio API not supported');
    }
  }

  // Ensure audio context is running (needed for some browsers)
  async ensureAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  // Play a single beep
  async playBeep(frequency = 800, duration = 0.2, volume = 0.3) {
    if (!this.enabled || !this.audioContext) return;

    await this.ensureAudioContext();

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gainNode.gain.value = volume;

    const now = this.audioContext.currentTime;
    oscillator.start(now);
    oscillator.stop(now + duration);

    return new Promise(resolve => {
      setTimeout(resolve, duration * 1000);
    });
  }

  // Play countdown beeps (last 5 seconds)
  async playCountdownBeeps(seconds = 5) {
    if (!this.enabled) return;

    for (let i = seconds; i > 0; i--) {
      // Higher pitch for last beep
      const frequency = i === 1 ? 1000 : 800;
      const duration = i === 1 ? 0.3 : 0.2;

      await this.playBeep(frequency, duration);

      // Wait for rest of the second
      await this.wait(1000 - (duration * 1000));
    }

    // Final "go" beep
    await this.playBeep(1200, 0.3, 0.4);
  }

  // Play success sound
  async playSuccess() {
    if (!this.enabled || !this.audioContext) return;

    await this.ensureAudioContext();

    // Play ascending tones
    await this.playBeep(600, 0.15, 0.3);
    await this.wait(50);
    await this.playBeep(800, 0.15, 0.3);
    await this.wait(50);
    await this.playBeep(1000, 0.25, 0.4);
  }

  // Enable/disable audio
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  // Wait utility
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ===================================
// WAKE LOCK MANAGER
// ===================================

class WakeLockManager {
  constructor() {
    this.wakeLock = null;
    this.isSupported = 'wakeLock' in navigator;
  }

  // Request wake lock
  async request() {
    if (!this.isSupported) {
      console.warn('Wake Lock API not supported');
      return false;
    }

    try {
      this.wakeLock = await navigator.wakeLock.request('screen');

      console.log('Wake Lock acquired');

      // Handle wake lock release
      this.wakeLock.addEventListener('release', () => {
        console.log('Wake Lock released');
      });

      return true;
    } catch (err) {
      console.error('Wake Lock request failed:', err);
      return false;
    }
  }

  // Release wake lock
  async release() {
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
        this.wakeLock = null;
        console.log('Wake Lock released manually');
      } catch (err) {
        console.error('Wake Lock release failed:', err);
      }
    }
  }

  // Check if wake lock is active
  isActive() {
    return this.wakeLock !== null && !this.wakeLock.released;
  }
}

// ===================================
// VOICE WORKOUT STATE MANAGER
// ===================================

class VoiceWorkoutStateManager {
  constructor() {
    this.storageKey = 'voiceWorkoutSession';
  }

  // Save state to localStorage
  saveState(state) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
      return true;
    } catch (error) {
      console.error('Failed to save voice workout state:', error);
      return false;
    }
  }

  // Load state from localStorage
  loadState() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load voice workout state:', error);
      return null;
    }
  }

  // Clear state
  clearState() {
    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.error('Failed to clear voice workout state:', error);
      return false;
    }
  }

  // Check if there's an active session
  hasActiveSession() {
    const state = this.loadState();
    return state && state.active === true;
  }

  // Create initial state
  createInitialState(planData, config) {
    return {
      active: true,
      planType: planData.type,
      planId: planData.id,
      planName: planData.name,
      sections: planData.sections,
      exercises: planData.exercises,
      currentSectionIndex: 0,
      currentExerciseIndex: 0,
      timerState: {
        type: 'ready', // 'ready', 'countdown', 'exercise', 'rest'
        running: false,
        elapsed: 0,
        total: 0
      },
      config: {
        pauseDuration: config.pauseDuration || 10,
        voiceEnabled: config.voiceEnabled !== false,
        beepsEnabled: config.beepsEnabled !== false,
        wakeLockEnabled: config.wakeLockEnabled === true
      },
      startTime: Date.now(),
      totalElapsed: 0
    };
  }

  // Update specific fields
  updateState(updates) {
    const currentState = this.loadState();
    if (!currentState) return false;

    const newState = { ...currentState, ...updates };
    return this.saveState(newState);
  }
}

// Export classes for use in app
if (typeof window !== 'undefined') {
  window.VoiceGuideManager = VoiceGuideManager;
  window.AudioManager = AudioManager;
  window.WakeLockManager = WakeLockManager;
  window.VoiceWorkoutStateManager = VoiceWorkoutStateManager;
}
