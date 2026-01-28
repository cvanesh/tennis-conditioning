// Voice-Guided Workout Controller
// Orchestrates the entire voice-guided workout experience

class VoiceWorkoutController {
  constructor() {
    // Managers
    this.voiceGuide = new VoiceGuideManager();
    this.audioManager = new AudioManager();
    this.wakeLockManager = new WakeLockManager();
    this.stateManager = new VoiceWorkoutStateManager();

    // State
    this.state = null;
    this.timer = null;
    this.timerInterval = null;
    this.totalTimeInterval = null;
    this.isRunning = false;

    // DOM Elements
    this.elements = {};

    // Visibility handler
    this.visibilityHandler = this.handleVisibilityChange.bind(this);
  }

  // ===================================
  // INITIALIZATION
  // ===================================

  init() {
    this.cacheElements();
    this.setupEventListeners();
    this.checkForResumeSession();
  }

  cacheElements() {
    // Config Modal
    this.elements.configModal = document.getElementById('voiceConfigModal');
    this.elements.configClose = document.getElementById('voiceConfigClose');
    this.elements.pauseButtons = document.querySelectorAll('[data-pause]');
    this.elements.voiceEnabledToggle = document.getElementById('voiceEnabled');
    this.elements.beepsEnabledToggle = document.getElementById('beepsEnabled');
    this.elements.wakeLockEnabledToggle = document.getElementById('wakeLockEnabled');
    this.elements.startVoiceWorkoutBtn = document.getElementById('startVoiceWorkout');

    // Workout Modal
    this.elements.workoutModal = document.getElementById('voiceWorkoutModal');
    this.elements.workoutClose = document.getElementById('voiceWorkoutClose');
    this.elements.workoutTitle = document.getElementById('voiceWorkoutTitle');
    this.elements.exerciseProgress = document.getElementById('voiceExerciseProgress');
    this.elements.totalTime = document.getElementById('voiceTotalTime');
    this.elements.sectionTimeline = document.getElementById('voiceSectionTimeline');
    this.elements.currentSection = document.getElementById('voiceCurrentSection');
    this.elements.currentExercise = document.getElementById('voiceCurrentExercise');
    this.elements.exerciseDetails = document.getElementById('voiceExerciseDetails');
    this.elements.timerDisplay = document.getElementById('voiceTimerDisplay');
    this.elements.timerLabel = document.getElementById('voiceTimerLabel');
    this.elements.timerRing = document.getElementById('voiceTimerRing');

    // Controls
    this.elements.playPauseBtn = document.getElementById('voicePlayPauseBtn');
    this.elements.repeatBtn = document.getElementById('voiceRepeatBtn');
    this.elements.prevSectionBtn = document.getElementById('voicePrevSectionBtn');
    this.elements.nextSectionBtn = document.getElementById('voiceNextSectionBtn');
    this.elements.prevExerciseBtn = document.getElementById('voicePrevExerciseBtn');
    this.elements.nextExerciseBtn = document.getElementById('voiceNextExerciseBtn');

    // Duration Range Toggle
    this.elements.durationRangeToggle = document.getElementById('durationRangeToggle');
    this.elements.durationToggleSwitch = document.getElementById('durationToggleSwitch');
    this.elements.durationMinLabel = document.getElementById('durationMinLabel');
    this.elements.durationMaxLabel = document.getElementById('durationMaxLabel');

    // Voice Guided Button (in workout view)
    this.elements.voiceGuidedBtn = document.getElementById('voiceGuidedBtn');
  }

  setupEventListeners() {
    // Config Modal
    this.elements.configClose?.addEventListener('click', () => this.closeConfigModal());
    this.elements.pauseButtons?.forEach(btn => {
      btn.addEventListener('click', (e) => this.selectPauseDuration(e.target));
    });
    this.elements.startVoiceWorkoutBtn?.addEventListener('click', () => this.startWorkout());

    // Toggle text updates
    this.elements.voiceEnabledToggle?.addEventListener('change', (e) => {
      const label = e.target.parentElement.querySelector('.toggle-text');
      if (label) label.textContent = e.target.checked ? 'Enabled' : 'Disabled';
    });
    this.elements.beepsEnabledToggle?.addEventListener('change', (e) => {
      const label = e.target.parentElement.querySelector('.toggle-text');
      if (label) label.textContent = e.target.checked ? 'Enabled' : 'Disabled';
    });
    this.elements.wakeLockEnabledToggle?.addEventListener('change', (e) => {
      const label = e.target.parentElement.querySelector('.toggle-text');
      if (label) label.textContent = e.target.checked ? 'Enabled' : 'Disabled';
    });

    // Workout Modal
    this.elements.workoutClose?.addEventListener('click', () => this.confirmStopWorkout());
    this.elements.playPauseBtn?.addEventListener('click', () => this.togglePlayPause());
    this.elements.prevSectionBtn?.addEventListener('click', () => this.navigateSection(-1));
    this.elements.nextSectionBtn?.addEventListener('click', () => this.navigateSection(1));
    this.elements.prevExerciseBtn?.addEventListener('click', () => this.navigateExercise(-1));
    this.elements.nextExerciseBtn?.addEventListener('click', () => this.navigateExercise(1));

    // Make timer clickable for play/pause
    const timerClickable = document.getElementById('voiceTimerClickable');
    timerClickable?.addEventListener('click', () => this.togglePlayPause());

    // Duration Range Toggle
    this.elements.durationToggleSwitch?.addEventListener('click', () => this.toggleDurationRange());

    // Voice Guided Button
    this.elements.voiceGuidedBtn?.addEventListener('click', () => this.showConfigModal());

    // Click outside modal to close
    this.elements.configModal?.addEventListener('click', (e) => {
      if (e.target === this.elements.configModal) {
        this.closeConfigModal();
      }
    });

    // Page visibility
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  // ===================================
  // CONFIG MODAL
  // ===================================

  showConfigModal() {
    if (!this.elements.configModal) return;

    // Reset to defaults
    this.selectPauseDuration(document.querySelector('[data-pause="10"]'));
    this.elements.voiceEnabledToggle.checked = true;
    this.elements.beepsEnabledToggle.checked = true;
    this.elements.wakeLockEnabledToggle.checked = false; // Disabled by default

    this.elements.configModal.classList.add('active');
  }

  closeConfigModal() {
    this.elements.configModal?.classList.remove('active');
  }

  selectPauseDuration(button) {
    if (!button) return;

    // Remove active from all
    this.elements.pauseButtons.forEach(btn => btn.classList.remove('active'));
    // Add active to selected
    button.classList.add('active');
  }

  getConfig() {
    const pauseBtn = document.querySelector('[data-pause].active');
    return {
      pauseDuration: parseInt(pauseBtn?.dataset.pause || '10'),
      voiceEnabled: this.elements.voiceEnabledToggle?.checked !== false,
      beepsEnabled: this.elements.beepsEnabledToggle?.checked !== false,
      wakeLockEnabled: this.elements.wakeLockEnabledToggle?.checked === true
    };
  }

  // ===================================
  // WORKOUT FLOW
  // ===================================

  async startWorkout() {
    // Get current plan data from App
    const planData = this.getCurrentPlanData();
    if (!planData) {
      this.showToast('No workout plan selected', 'error');
      return;
    }

    // Clear any existing session (start fresh, don't resume)
    this.stateManager.clearState();

    // Get config
    const config = this.getConfig();

    // Set managers
    this.voiceGuide.setEnabled(config.voiceEnabled);
    this.audioManager.setEnabled(config.beepsEnabled);

    // Request wake lock only if enabled
    if (config.wakeLockEnabled) {
      await this.wakeLockManager.request();
    }

    // Create initial state
    this.state = this.stateManager.createInitialState(planData, config);
    this.stateManager.saveState(this.state);

    // Close config modal, show workout modal
    this.closeConfigModal();
    this.showWorkoutModal();

    // Start workout
    await this.startExerciseFlow();
  }

  async startExerciseFlow() {
    if (!this.state) return;

    // Get current section and exercise
    const section = this.state.sections[this.state.currentSectionIndex];
    const exercise = this.state.exercises[this.state.currentExerciseIndex];

    if (!section || !exercise) {
      await this.completeWorkout();
      return;
    }

    // Update UI
    this.updateUI();

    // Check if new section
    const isNewSection = this.isFirstExerciseInSection();
    if (isNewSection) {
      await this.announceSection(section);
      if (!this.state) return; // Workout may have been stopped during announcement
    }

    // Announce exercise
    await this.announceExercise(exercise);
    if (!this.state) return; // Workout may have been stopped during announcement

    // Start countdown
    await this.startCountdown();
    if (!this.state) return; // Workout may have been stopped during countdown

    // Start exercise timer
    this.startExerciseTimer(exercise);
  }

  isFirstExerciseInSection() {
    if (!this.state || !this.state.exercises || !this.state.sections) return false;

    // Check if current exercise is the first in its section
    const currentExercise = this.state.exercises[this.state.currentExerciseIndex];
    const section = this.state.sections[this.state.currentSectionIndex];

    if (!section || !section.exercises || !currentExercise) return false;

    return section.exercises[0]?.name === currentExercise.name;
  }

  async announceSection(section) {
    await this.voiceGuide.announceSection(section.name);
  }

  async announceExercise(exercise) {
    const currentNum = this.state.currentExerciseIndex + 1;
    const totalNum = this.state.exercises.length;

    await this.voiceGuide.announceExercise(exercise.name, currentNum, totalNum);
    await this.voiceGuide.announceInstructions(exercise);
  }

  async startCountdown() {
    this.state.timerState.type = 'countdown';
    this.state.timerState.total = 5;
    this.state.timerState.elapsed = 0;
    this.updateTimerDisplay();

    // Create countdown interval to update display
    return new Promise((resolve) => {
      let count = 5;

      this.countdownInterval = setInterval(() => {
        // Check if state still exists (workout might have been stopped)
        if (!this.state) {
          clearInterval(this.countdownInterval);
          this.countdownInterval = null;
          resolve();
          return;
        }

        count--;
        this.state.timerState.elapsed++;
        this.updateTimerDisplay();

        if (count <= 0) {
          clearInterval(this.countdownInterval);
          this.countdownInterval = null;
          resolve();
        }
      }, 1000);

      // Play countdown with beeps and voice (in parallel with visual countdown)
      if (this.state.config.beepsEnabled) {
        this.audioManager.playCountdownBeeps(5);
      } else {
        this.voiceGuide.announceCountdown(5);
      }
    });
  }

  startExerciseTimer(exercise) {
    if (!this.state) return; // Guard against null state

    // Parse duration (e.g., "30 seconds", "1 minute", "2 x 30 seconds")
    const duration = this.parseDuration(exercise.duration || exercise.time || '30 seconds');

    this.state.timerState.type = 'exercise';
    this.state.timerState.total = duration;
    this.state.timerState.elapsed = 0;
    this.state.timerState.running = true;
    this.isRunning = true;

    this.stateManager.saveState(this.state);
    this.updateTimerDisplay();
    this.updatePlayPauseButton();

    // Announce description during exercise
    this.voiceGuide.announceDescription(exercise);

    // Start timer
    this.timerInterval = setInterval(() => {
      if (!this.isRunning || !this.state) return;

      this.state.timerState.elapsed++;

      if (this.state.timerState.elapsed >= this.state.timerState.total) {
        this.onExerciseComplete();
      } else {
        this.updateTimerDisplay();
        this.stateManager.saveState(this.state);
      }
    }, 1000);

    // Start total time tracker
    if (!this.totalTimeInterval) {
      this.totalTimeInterval = setInterval(() => {
        if (this.isRunning && this.state) {
          this.state.totalElapsed++;
          this.updateTotalTime();
        }
      }, 1000);
    }
  }

  async onExerciseComplete() {
    this.stopTimer();

    if (!this.state) return; // Guard against null state

    // Move to next exercise
    this.state.currentExerciseIndex++;

    // Check if section complete
    const nextExercise = this.state.exercises[this.state.currentExerciseIndex];
    const currentSection = this.state.sections[this.state.currentSectionIndex];

    if (nextExercise && nextExercise.sectionName !== currentSection?.name) {
      // Section complete
      await this.voiceGuide.announceSectionComplete(
        currentSection.name,
        this.state.sections[this.state.currentSectionIndex + 1]?.name
      );
      if (!this.state) return; // Workout may have been stopped during announcement
      this.state.currentSectionIndex++;
    }

    // Check if workout complete
    if (this.state.currentExerciseIndex >= this.state.exercises.length) {
      await this.completeWorkout();
      return;
    }

    // Rest period before next exercise
    await this.startRestPeriod();
  }

  async startRestPeriod() {
    if (!this.state) return; // Guard against null state

    this.state.timerState.type = 'rest';
    this.state.timerState.total = this.state.config.pauseDuration;
    this.state.timerState.elapsed = 0;
    this.state.timerState.running = true;
    this.isRunning = true;

    this.updateTimerDisplay();
    this.stateManager.saveState(this.state);

    // Announce next exercise during rest
    const nextExercise = this.state.exercises[this.state.currentExerciseIndex];
    if (nextExercise) {
      await this.voiceGuide.speak(`Next: ${nextExercise.name}`);
      if (!this.state) return; // Workout may have been stopped during announcement
    }

    this.timerInterval = setInterval(() => {
      if (!this.isRunning || !this.state) return;

      this.state.timerState.elapsed++;

      if (this.state.timerState.elapsed >= this.state.timerState.total) {
        this.stopTimer();
        this.startExerciseFlow();
      } else {
        this.updateTimerDisplay();
      }
    }, 1000);
  }

  async completeWorkout() {
    this.stopTimer();
    this.stopTotalTimeTracker();

    await this.voiceGuide.announceWorkoutComplete();
    await this.audioManager.playSuccess();

    // Show completion summary
    setTimeout(() => {
      this.showCompletionSummary();
    }, 1000);
  }

  showCompletionSummary() {
    if (!this.state) {
      console.warn('Cannot show completion summary: state is null');
      this.closeWorkout();
      return;
    }

    const minutes = Math.floor(this.state.totalElapsed / 60);
    const seconds = this.state.totalElapsed % 60;

    // Use app's modal system
    const app = window.TennisApp || window.App;
    if (app && app.elements && app.elements.modal) {
      const modal = app.elements.modal;
      const modalBody = app.elements.modalBody;

      modalBody.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
          <h2 style="margin: 16px 0;">Workout Complete!</h2>
          <p style="margin: 12px 0; color: var(--text-secondary);">Great Job!</p>
          <div style="display: grid; gap: 12px; margin: 24px 0; text-align: left; max-width: 300px; margin-left: auto; margin-right: auto;">
            <div style="padding: 12px; background: var(--surface); border-radius: 8px;"><strong>Total Time:</strong> ${minutes}:${String(seconds).padStart(2, '0')}</div>
            <div style="padding: 12px; background: var(--surface); border-radius: 8px;"><strong>Exercises Completed:</strong> ${this.state.exercises.length}</div>
            <div style="padding: 12px; background: var(--surface); border-radius: 8px;"><strong>Sections:</strong> ${this.state.sections.length}</div>
          </div>
          <button onclick="document.getElementById('modal').classList.remove('active')" class="modal-btn modal-btn-primary">Done</button>
        </div>
      `;

      modal.classList.add('active');
    }

    this.closeWorkout();
  }

  // ===================================
  // PLAYBACK CONTROLS
  // ===================================

  togglePlayPause() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.resume();
    }
  }

  async pause() {
    this.isRunning = false;

    // Cancel any ongoing voice announcements
    this.voiceGuide.cancel();

    if (this.state && this.state.timerState) {
      this.state.timerState.running = false;
      this.stateManager.saveState(this.state);
    }

    this.updatePlayPauseButton();

    await this.voiceGuide.announcePause();
  }

  async resume() {
    if (!this.state) return;

    this.isRunning = true;
    this.state.timerState.running = true;
    this.stateManager.saveState(this.state);
    this.updatePlayPauseButton();

    await this.voiceGuide.announceResume();
  }

  async repeatInstructions() {
    if (!this.state || !this.state.exercises) return;
    const exercise = this.state.exercises[this.state.currentExerciseIndex];
    if (exercise) {
      await this.voiceGuide.announceInstructions(exercise);
    }
  }

  // ===================================
  // NAVIGATION
  // ===================================

  navigateSection(direction) {
    if (!this.state || !this.state.sections || !this.state.exercises) return;

    const newIndex = this.state.currentSectionIndex + direction;

    if (newIndex < 0 || newIndex >= this.state.sections.length) {
      return; // Out of bounds
    }

    // Find first exercise in new section
    const newSection = this.state.sections[newIndex];
    const exerciseIndex = this.state.exercises.findIndex(ex => ex.sectionName === newSection.name);

    if (exerciseIndex === -1) return;

    // Stop current timer
    this.stopTimer();

    // Update state
    this.state.currentSectionIndex = newIndex;
    this.state.currentExerciseIndex = exerciseIndex;
    this.stateManager.saveState(this.state);

    // Restart flow
    this.startExerciseFlow();
  }

  navigateExercise(direction) {
    if (!this.state || !this.state.exercises || !this.state.sections) return;

    const newIndex = this.state.currentExerciseIndex + direction;

    if (newIndex < 0 || newIndex >= this.state.exercises.length) {
      return; // Out of bounds
    }

    // Stop current timer
    this.stopTimer();

    // Update state
    this.state.currentExerciseIndex = newIndex;

    // Update section index if needed
    const newExercise = this.state.exercises[newIndex];
    const sectionIndex = this.state.sections.findIndex(s => s.name === newExercise.sectionName);
    if (sectionIndex !== -1) {
      this.state.currentSectionIndex = sectionIndex;
    }

    this.stateManager.saveState(this.state);

    // Restart flow
    this.startExerciseFlow();
  }

  // ===================================
  // TIMER MANAGEMENT
  // ===================================

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  stopTotalTimeTracker() {
    if (this.totalTimeInterval) {
      clearInterval(this.totalTimeInterval);
      this.totalTimeInterval = null;
    }
  }

  // ===================================
  // UI UPDATES
  // ===================================

  updateUI() {
    if (!this.state) return;

    const section = this.state.sections[this.state.currentSectionIndex];
    const exercise = this.state.exercises[this.state.currentExerciseIndex];

    // Update workout title
    this.elements.workoutTitle.textContent = this.state.planName;

    // Update progress
    const currentNum = this.state.currentExerciseIndex + 1;
    const totalNum = this.state.exercises.length;
    this.elements.exerciseProgress.textContent = `Exercise ${currentNum} of ${totalNum}`;

    // Update section
    this.elements.currentSection.textContent = section?.name || '';

    // Update exercise
    this.elements.currentExercise.textContent = exercise?.name || '';

    // Update details
    let details = [];
    if (exercise?.sets) details.push(exercise.sets);
    if (exercise?.reps) details.push(exercise.reps);
    if (exercise?.duration || exercise?.time) {
      details.push(exercise.duration || exercise.time);
    }

    // Fallback to showing just the exercise type if no details
    if (details.length === 0 && exercise?.category) {
      details.push(exercise.category);
    }

    this.elements.exerciseDetails.textContent = details.length > 0 ? details.join(' • ') : 'Follow instructions';

    // Update total time
    this.updateTotalTime();

    // Update navigation buttons
    this.updateNavigationButtons();

    // Setup duration range toggle if applicable
    this.setupDurationRangeToggle();

    // Update section timeline
    this.updateSectionTimeline();
  }

  generateSectionTimeline() {
    if (!this.state || !this.state.sections || !this.elements.sectionTimeline) return;

    const sections = this.state.sections;
    let html = '<div class="timeline-connector"><div class="timeline-connector-progress" id="timelineProgress"></div></div>';

    sections.forEach((section, index) => {
      const sectionClass = index < this.state.currentSectionIndex ? 'completed' :
                          index === this.state.currentSectionIndex ? 'active' : '';

      html += `
        <div class="timeline-section ${sectionClass}">
          <div class="timeline-dot">${index + 1}</div>
          <div class="timeline-label" title="${section.name}">${section.name}</div>
        </div>
      `;
    });

    this.elements.sectionTimeline.innerHTML = html;
  }

  updateSectionTimeline() {
    if (!this.state || !this.state.sections) return;

    // Generate timeline if empty
    if (!this.elements.sectionTimeline.querySelector('.timeline-section')) {
      this.generateSectionTimeline();
    }

    // Update section states
    const sections = this.elements.sectionTimeline.querySelectorAll('.timeline-section');
    sections.forEach((sectionEl, index) => {
      sectionEl.classList.remove('completed', 'active');

      if (index < this.state.currentSectionIndex) {
        sectionEl.classList.add('completed');
      } else if (index === this.state.currentSectionIndex) {
        sectionEl.classList.add('active');
      }
    });

    // Update progress line
    const progressLine = document.getElementById('timelineProgress');
    if (progressLine && this.state.sections.length > 1) {
      const progress = (this.state.currentSectionIndex / (this.state.sections.length - 1)) * 100;
      progressLine.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    }
  }

  updateTimerDisplay() {
    if (!this.state) return;

    const { type, elapsed, total } = this.state.timerState;
    const remaining = total - elapsed;

    // Update timer display
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    this.elements.timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    // Update label
    const labels = {
      countdown: 'Get Ready',
      exercise: 'Exercise',
      rest: 'Rest'
    };
    this.elements.timerLabel.textContent = labels[type] || 'Ready';

    // Update ring progress
    if (this.elements.timerRing && total > 0) {
      const circumference = 2 * Math.PI * 90; // radius = 90
      const progress = elapsed / total;
      const offset = circumference * (1 - progress);
      this.elements.timerRing.style.strokeDashoffset = offset;
    }
  }

  updateTotalTime() {
    if (!this.state) return;
    const minutes = Math.floor(this.state.totalElapsed / 60);
    const seconds = this.state.totalElapsed % 60;
    if (this.elements.totalTime) {
      this.elements.totalTime.textContent = `${minutes}:${String(seconds).padStart(2, '0')} elapsed`;
    }
  }

  updatePlayPauseButton() {
    // Update button icons
    const playIcon = this.elements.playPauseBtn?.querySelector('.play-icon');
    const pauseIcon = this.elements.playPauseBtn?.querySelector('.pause-icon');

    if (this.isRunning) {
      playIcon?.classList.add('hidden');
      pauseIcon?.classList.remove('hidden');
    } else {
      playIcon?.classList.remove('hidden');
      pauseIcon?.classList.add('hidden');
    }

    // Update timer overlay icons
    const timerOverlay = document.querySelector('.timer-play-overlay');
    if (timerOverlay) {
      const overlayPlayIcon = timerOverlay.querySelector('.play-icon');
      const overlayPauseIcon = timerOverlay.querySelector('.pause-icon');

      if (this.isRunning) {
        overlayPlayIcon?.classList.add('hidden');
        overlayPauseIcon?.classList.remove('hidden');
      } else {
        overlayPlayIcon?.classList.remove('hidden');
        overlayPauseIcon?.classList.add('hidden');
      }
    }
  }

  updateNavigationButtons() {
    if (!this.state) return;

    // Disable prev section if at first section
    if (this.elements.prevSectionBtn) {
      this.elements.prevSectionBtn.disabled = this.state.currentSectionIndex === 0;
    }

    // Disable next section if at last section
    if (this.elements.nextSectionBtn) {
      this.elements.nextSectionBtn.disabled =
        this.state.currentSectionIndex === this.state.sections.length - 1;
    }

    // Disable prev exercise if at first exercise
    if (this.elements.prevExerciseBtn) {
      this.elements.prevExerciseBtn.disabled = this.state.currentExerciseIndex === 0;
    }

    // Disable next exercise if at last exercise
    if (this.elements.nextExerciseBtn) {
      this.elements.nextExerciseBtn.disabled =
        this.state.currentExerciseIndex === this.state.exercises.length - 1;
    }
  }

  showWorkoutModal() {
    this.elements.workoutModal?.classList.add('active');
  }

  closeWorkoutModal() {
    this.elements.workoutModal?.classList.remove('active');
  }

  // ===================================
  // WORKOUT CONTROL
  // ===================================

  confirmStopWorkout() {
    // Pause the workout first
    if (this.isRunning) {
      this.pause();
    }

    // Show confirmation using app's showConfirm
    const app = window.TennisApp || window.App;
    if (app && app.showConfirm) {
      // Lower z-index of voice workout modal temporarily
      if (this.elements.workoutModal) {
        this.elements.workoutModal.style.zIndex = '999';
      }

      app.showConfirm(
        'Are you sure you want to stop the workout? Your progress will be lost.',
        () => {
          this.closeWorkout();
        },
        {
          title: 'Stop Workout?',
          confirmText: 'Stop',
          cancelText: 'Continue',
          isDanger: true,
          onCancel: () => {
            // Restore z-index when cancelled
            if (this.elements.workoutModal) {
              this.elements.workoutModal.style.zIndex = '';
            }
          }
        }
      );
    } else {
      // Fallback: close directly if showConfirm not available
      if (confirm('Are you sure you want to stop the workout? Your progress will be lost.')) {
        this.closeWorkout();
      }
    }
  }

  closeWorkout() {
    // Stop timers
    this.stopTimer();
    this.stopTotalTimeTracker();

    // Cancel voice
    this.voiceGuide.cancel();

    // Release wake lock
    this.wakeLockManager.release();

    // Clear state
    this.stateManager.clearState();
    this.state = null;
    this.isRunning = false;

    // Close modal
    this.closeWorkoutModal();
  }

  // ===================================
  // RESUME SESSION
  // ===================================

  checkForResumeSession() {
    if (this.stateManager.hasActiveSession()) {
      setTimeout(() => {
        const app = window.TennisApp || window.App;
        if (app && app.elements && app.elements.modal) {
          const modal = app.elements.modal;
          const modalBody = app.elements.modalBody;

          modalBody.innerHTML = `
            <h2>Resume Workout?</h2>
            <p class="modal-confirm-message">You have an active workout session. Do you want to resume where you left off?</p>
            <div class="modal-buttons">
              <button class="modal-btn modal-btn-secondary" id="confirmCancel">Start New</button>
              <button class="modal-btn modal-btn-primary" id="confirmOk">Resume</button>
            </div>
          `;

          modal.classList.add('active');

          // Handle resume
          document.getElementById('confirmOk').addEventListener('click', () => {
            modal.classList.remove('active');
            this.resumeSession();
          });

          // Handle start new
          document.getElementById('confirmCancel').addEventListener('click', () => {
            modal.classList.remove('active');
            this.stateManager.clearState();
          });
        }
      }, 1000);
    }
  }

  resumeSession() {
    this.state = this.stateManager.loadState();
    if (!this.state) return;

    // Restore config
    this.voiceGuide.setEnabled(this.state.config.voiceEnabled);
    this.audioManager.setEnabled(this.state.config.beepsEnabled);

    // Request wake lock only if it was enabled in the saved session
    if (this.state.config.wakeLockEnabled) {
      this.wakeLockManager.request();
    }

    // Show modal
    this.showWorkoutModal();

    // Update UI
    this.updateUI();
    this.updateTimerDisplay();

    // Resume if was running
    if (this.state.timerState.running) {
      // Continue from where it left off
      if (this.state.timerState.type === 'exercise') {
        const exercise = this.state.exercises[this.state.currentExerciseIndex];
        this.startExerciseTimer(exercise);
      } else if (this.state.timerState.type === 'rest') {
        this.startRestPeriod();
      }
    }
  }

  // ===================================
  // PAGE VISIBILITY
  // ===================================

  handleVisibilityChange() {
    if (document.hidden && this.isRunning) {
      // Page hidden, pause workout
      this.pause();
    }
  }

  // ===================================
  // HELPERS
  // ===================================

  showToast(message, type = 'info') {
    const app = window.TennisApp || window.App;
    if (app && app.showToast) {
      app.showToast(message, type);
    } else {
      // Fallback to console
      console.log(`[${type}] ${message}`);
    }
  }

  getCurrentPlanData() {
    // Get current plan from App state
    const app = window.TennisApp || window.App;
    if (!app || !app.state) return null;

    const { currentPlan, exercises, sections } = app.state;

    // Validate we have data
    if (!currentPlan || !exercises || exercises.length === 0) {
      return null;
    }

    return {
      type: currentPlan,
      id: currentPlan,
      name: this.getPlanName(currentPlan),
      sections: sections || [],
      exercises: exercises || []
    };
  }

  getPlanName(planType) {
    const names = {
      'warmup': 'Warm-Up Protocol',
      'cooldown': 'Cool-Down Protocol',
      '8-week': '8-Week Program'
    };
    return names[planType] || planType;
  }

  parseDuration(durationStr) {
    // Parse duration string to seconds
    // Examples: "30 seconds", "1 minute", "2 minutes", "2 x 30 seconds", "20-30 seconds", 120 (number)
    if (!durationStr) return 30;

    // If it's already a number, return it
    if (typeof durationStr === 'number') {
      return durationStr;
    }

    // Convert to string if not already
    const str = String(durationStr).toLowerCase();

    // Check if it's a range duration (e.g., "20-30 seconds")
    const rangeData = this.parseDurationRange(str);
    if (rangeData) {
      // Store range data for toggle UI
      this.currentDurationRange = rangeData;
      // Return the selected duration (default to min)
      return rangeData.useMax ? rangeData.max : rangeData.min;
    }

    // Match patterns
    if (str.includes('minute')) {
      const match = str.match(/(\d+)\s*minute/);
      if (match) return parseInt(match[1]) * 60;
    }

    if (str.includes('second')) {
      const match = str.match(/(\d+)\s*second/);
      if (match) return parseInt(match[1]);
    }

    // Try to parse as plain number
    const numMatch = str.match(/(\d+)/);
    if (numMatch) {
      return parseInt(numMatch[1]);
    }

    // Default
    return 30;
  }

  parseDurationRange(durationStr) {
    // Parse duration ranges like "20-30 seconds", "1-2 minutes"
    if (!durationStr || typeof durationStr !== 'string') return null;

    const str = durationStr.toLowerCase();

    // Check for range pattern (number-number)
    const rangeMatch = str.match(/(\d+)\s*-\s*(\d+)/);
    if (!rangeMatch) return null;

    const min = parseInt(rangeMatch[1]);
    const max = parseInt(rangeMatch[2]);

    // Determine unit (seconds or minutes)
    let multiplier = 1;
    if (str.includes('minute')) {
      multiplier = 60;
    }

    return {
      min: min * multiplier,
      max: max * multiplier,
      useMax: this.currentDurationRange?.useMax || false, // Remember user's choice
      unit: multiplier === 60 ? 'min' : 'sec'
    };
  }

  setupDurationRangeToggle() {
    if (!this.state || !this.state.exercises) {
      if (this.elements.durationRangeToggle) {
        this.elements.durationRangeToggle.style.display = 'none';
      }
      this.currentDurationRange = null;
      return;
    }

    // Setup duration range toggle UI if current exercise has range
    const exercise = this.state.exercises[this.state.currentExerciseIndex];
    const durationStr = exercise?.duration || exercise?.time;

    if (!durationStr) {
      if (this.elements.durationRangeToggle) {
        this.elements.durationRangeToggle.style.display = 'none';
      }
      this.currentDurationRange = null;
      return;
    }

    const rangeData = this.parseDurationRange(String(durationStr));

    if (!rangeData) {
      this.elements.durationRangeToggle.style.display = 'none';
      this.currentDurationRange = null;
      return;
    }

    // Show toggle
    this.elements.durationRangeToggle.style.display = 'flex';
    this.currentDurationRange = rangeData;

    // Update labels
    this.elements.durationMinLabel.textContent = `${rangeData.min}${rangeData.unit}`;
    this.elements.durationMaxLabel.textContent = `${rangeData.max}${rangeData.unit}`;

    // Update toggle switch state
    if (rangeData.useMax) {
      this.elements.durationToggleSwitch.classList.add('active');
    } else {
      this.elements.durationToggleSwitch.classList.remove('active');
    }
  }

  toggleDurationRange() {
    if (!this.currentDurationRange) return;

    // Toggle between min and max
    this.currentDurationRange.useMax = !this.currentDurationRange.useMax;

    // Update toggle switch UI
    if (this.currentDurationRange.useMax) {
      this.elements.durationToggleSwitch.classList.add('active');
    } else {
      this.elements.durationToggleSwitch.classList.remove('active');
    }

    // If timer is not running, update the total time
    if (!this.isRunning && this.state.timerState.type === 'ready') {
      const exercise = this.state.exercises[this.state.currentExerciseIndex];
      const newDuration = this.parseDuration(exercise.duration || exercise.time);
      this.state.timerState.total = newDuration;
      this.updateTimerDisplay();
    }
  }
}

// Export
if (typeof window !== 'undefined') {
  window.VoiceWorkoutController = VoiceWorkoutController;
}
