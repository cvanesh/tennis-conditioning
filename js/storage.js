// LocalStorage Management for Tennis Conditioning App
// Handles all data persistence and state management

const Storage = {
  // Storage keys
  KEYS: {
    PROGRESS: 'tennis_conditioning_progress',
    CURRENT_SESSION: 'tennis_conditioning_current_session',
    CUSTOM_WORKOUTS: 'tennis_conditioning_custom_workouts',
    SETTINGS: 'tennis_conditioning_settings'
  },

  // Error handler callback
  errorHandler: null,

  // Set error handler
  setErrorHandler(handler) {
    this.errorHandler = handler;
  },

  // Handle errors
  handleError(error, context = '') {
    console.error(`Storage error ${context}:`, error);
    if (this.errorHandler) {
      this.errorHandler(error, context);
    }
  },

  // Initialize storage with default values if not exists
  init() {
    if (!this.get(this.KEYS.PROGRESS)) {
      this.set(this.KEYS.PROGRESS, {
        eightWeek: {},
        warmup: { completed: false },
        cooldown: { completed: false }
      });
    }

    if (!this.get(this.KEYS.CUSTOM_WORKOUTS)) {
      this.set(this.KEYS.CUSTOM_WORKOUTS, []);
    }

    if (!this.get(this.KEYS.SETTINGS)) {
      this.set(this.KEYS.SETTINGS, {
        soundEnabled: true,
        vibrateEnabled: true
      });
    }
  },

  // Generic get/set methods
  get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.handleError(error, `reading key "${key}"`);
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      this.handleError(error, `writing key "${key}"`);
      // Check for quota exceeded
      if (error.name === 'QuotaExceededError') {
        this.handleError(new Error('Storage quota exceeded. Please clear some data.'), 'quota');
      }
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      this.handleError(error, `removing key "${key}"`);
      return false;
    }
  },

  clear() {
    try {
      localStorage.clear();
      this.init();
      return true;
    } catch (error) {
      this.handleError(error, 'clearing storage');
      return false;
    }
  },

  // ===================================
  // CURRENT SESSION MANAGEMENT
  // ===================================

  // Get current active session
  getCurrentSession() {
    return this.get(this.KEYS.CURRENT_SESSION);
  },

  // Start a new workout session
  startSession(plan, week = null, day = null) {
    const session = {
      plan: plan, // '8-week', 'warmup', 'cooldown', 'custom'
      week: week,
      day: day,
      startedAt: new Date().toISOString(),
      exercises: [],
      currentExerciseIndex: 0,
      paused: false
    };

    this.set(this.KEYS.CURRENT_SESSION, session);
    return session;
  },

  // Update current session
  updateSession(updates) {
    const session = this.getCurrentSession();
    if (!session) return null;

    const updatedSession = { ...session, ...updates };
    this.set(this.KEYS.CURRENT_SESSION, updatedSession);
    return updatedSession;
  },

  // Mark exercise as completed in current session
  completeExercise(exerciseIndex) {
    const session = this.getCurrentSession();
    if (!session) return null;

    if (!session.exercises[exerciseIndex]) {
      session.exercises[exerciseIndex] = {};
    }

    session.exercises[exerciseIndex].completed = true;
    session.exercises[exerciseIndex].completedAt = new Date().toISOString();

    this.set(this.KEYS.CURRENT_SESSION, session);
    return session;
  },

  // Toggle exercise completion
  toggleExercise(exerciseIndex) {
    const session = this.getCurrentSession();
    if (!session) return null;

    if (!session.exercises[exerciseIndex]) {
      session.exercises[exerciseIndex] = { completed: false };
    }

    session.exercises[exerciseIndex].completed = !session.exercises[exerciseIndex].completed;

    if (session.exercises[exerciseIndex].completed) {
      session.exercises[exerciseIndex].completedAt = new Date().toISOString();
    } else {
      delete session.exercises[exerciseIndex].completedAt;
    }

    this.set(this.KEYS.CURRENT_SESSION, session);
    return session;
  },

  // Get exercise completion status
  isExerciseCompleted(exerciseIndex) {
    const session = this.getCurrentSession();
    if (!session) return false;

    return session.exercises[exerciseIndex]?.completed || false;
  },

  // Get completed exercises count
  getCompletedCount() {
    const session = this.getCurrentSession();
    if (!session) return 0;

    return session.exercises.filter(ex => ex?.completed).length;
  },

  // Reset current session
  resetSession() {
    const session = this.getCurrentSession();
    if (!session) return null;

    session.exercises = [];
    session.currentExerciseIndex = 0;
    session.startedAt = new Date().toISOString();

    this.set(this.KEYS.CURRENT_SESSION, session);
    return session;
  },

  // End session and save progress
  endSession() {
    const session = this.getCurrentSession();
    if (!session) return null;

    // Save to progress history
    if (session.plan === '8-week' && session.week && session.day) {
      this.saveProgress(session.plan, session.week, session.day, session);
    }

    // Clear current session
    this.remove(this.KEYS.CURRENT_SESSION);
    return session;
  },

  // ===================================
  // PROGRESS TRACKING
  // ===================================

  // Get all progress
  getProgress() {
    return this.get(this.KEYS.PROGRESS);
  },

  // Save workout progress
  saveProgress(plan, week, day, sessionData) {
    const progress = this.getProgress();

    if (plan === '8-week') {
      if (!progress.eightWeek[week]) {
        progress.eightWeek[week] = {};
      }

      progress.eightWeek[week][day] = {
        completed: true,
        completedAt: new Date().toISOString(),
        exercisesCompleted: sessionData.exercises.filter(ex => ex?.completed).length,
        totalExercises: sessionData.exercises.length,
        duration: this.calculateDuration(sessionData.startedAt)
      };
    } else {
      // For warmup, cooldown, custom workouts
      progress[plan] = {
        completed: true,
        lastCompletedAt: new Date().toISOString()
      };
    }

    this.set(this.KEYS.PROGRESS, progress);
    return progress;
  },

  // Check if a specific workout is completed
  isWorkoutCompleted(plan, week = null, day = null) {
    const progress = this.getProgress();

    if (plan === '8-week' && week && day) {
      return progress.eightWeek[week]?.[day]?.completed || false;
    }

    return progress[plan]?.completed || false;
  },

  // Get workout progress percentage
  getWorkoutProgress(plan, week = null, day = null) {
    const progress = this.getProgress();

    if (plan === '8-week' && week && day) {
      const workout = progress.eightWeek[week]?.[day];
      if (!workout) return 0;

      return Math.round((workout.exercisesCompleted / workout.totalExercises) * 100);
    }

    return 0;
  },

  // Get week completion status
  getWeekCompletion(week) {
    const progress = this.getProgress();
    const weekData = progress.eightWeek[week];

    if (!weekData) return { completed: 0, total: 4, percentage: 0 };

    const days = ['monday', 'tuesday', 'thursday', 'friday'];
    const completed = days.filter(day => weekData[day]?.completed).length;

    return {
      completed: completed,
      total: 4,
      percentage: Math.round((completed / 4) * 100)
    };
  },

  // Get overall program completion
  getProgramCompletion() {
    const progress = this.getProgress();
    let totalCompleted = 0;
    const totalWorkouts = 32; // 8 weeks x 4 days

    for (let week = 1; week <= 8; week++) {
      const weekKey = `week${week}`;
      const weekData = progress.eightWeek[weekKey];

      if (weekData) {
        const days = ['monday', 'tuesday', 'thursday', 'friday'];
        totalCompleted += days.filter(day => weekData[day]?.completed).length;
      }
    }

    return {
      completed: totalCompleted,
      total: totalWorkouts,
      percentage: Math.round((totalCompleted / totalWorkouts) * 100)
    };
  },

  // Check if week is in progress
  isWeekInProgress(week) {
    const progress = this.getProgress();
    const weekData = progress.eightWeek[`week${week}`];

    if (!weekData) return false;

    const days = ['monday', 'tuesday', 'thursday', 'friday'];
    const hasCompleted = days.some(day => weekData[day]?.completed);
    const allCompleted = days.every(day => weekData[day]?.completed);

    return hasCompleted && !allCompleted;
  },

  // ===================================
  // CUSTOM WORKOUTS
  // ===================================

  // Get all custom workouts
  getCustomWorkouts() {
    return this.get(this.KEYS.CUSTOM_WORKOUTS) || [];
  },

  // Add new custom workout
  addCustomWorkout(workout) {
    const workouts = this.getCustomWorkouts();

    const newWorkout = {
      id: `custom_${Date.now()}`,
      name: workout.name || 'Custom Workout',
      exercises: workout.exercises || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    workouts.push(newWorkout);
    this.set(this.KEYS.CUSTOM_WORKOUTS, workouts);
    return newWorkout;
  },

  // Update custom workout
  updateCustomWorkout(id, updates) {
    const workouts = this.getCustomWorkouts();
    const index = workouts.findIndex(w => w.id === id);

    if (index === -1) return null;

    workouts[index] = {
      ...workouts[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.set(this.KEYS.CUSTOM_WORKOUTS, workouts);
    return workouts[index];
  },

  // Delete custom workout
  deleteCustomWorkout(id) {
    const workouts = this.getCustomWorkouts();
    const filtered = workouts.filter(w => w.id !== id);
    this.set(this.KEYS.CUSTOM_WORKOUTS, filtered);
    return true;
  },

  // Get custom workout by ID
  getCustomWorkout(id) {
    if (!id) {
      // If no ID, return the current in-progress custom workout
      return this.get('currentCustomWorkout') || [];
    }
    const workouts = this.getCustomWorkouts();
    return workouts.find(w => w.id === id) || null;
  },

  // Save current custom workout (in progress)
  saveCustomWorkout(exercises) {
    this.set('currentCustomWorkout', exercises);
  },

  // ===================================
  // SETTINGS
  // ===================================

  getSettings() {
    return this.get(this.KEYS.SETTINGS);
  },

  updateSettings(updates) {
    const settings = this.getSettings();
    const updated = { ...settings, ...updates };
    this.set(this.KEYS.SETTINGS, updated);
    return updated;
  },

  // ===================================
  // UTILITIES
  // ===================================

  // Calculate duration in minutes from ISO timestamp
  calculateDuration(startTimestamp) {
    const start = new Date(startTimestamp);
    const end = new Date();
    const durationMs = end - start;
    return Math.round(durationMs / 60000); // Convert to minutes
  },

  // Format date for display
  formatDate(isoString) {
    if (!isoString) return 'Not started';

    const date = new Date(isoString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if today
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }

    // Check if yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    // Format as date
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  },

  // Get time ago string
  getTimeAgo(isoString) {
    if (!isoString) return '';

    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return this.formatDate(isoString);
  },

  // Export data as JSON
  exportData() {
    return {
      progress: this.getProgress(),
      customWorkouts: this.getCustomWorkouts(),
      settings: this.getSettings(),
      exportedAt: new Date().toISOString()
    };
  },

  // Import data from JSON
  importData(data) {
    try {
      if (data.progress) this.set(this.KEYS.PROGRESS, data.progress);
      if (data.customWorkouts) this.set(this.KEYS.CUSTOM_WORKOUTS, data.customWorkouts);
      if (data.settings) this.set(this.KEYS.SETTINGS, data.settings);
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
};

// Initialize storage on load
Storage.init();
