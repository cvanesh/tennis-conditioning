// Tennis Conditioning Pro - Main Application Logic
// Single Page Application Controller

const App = {
  // Application state
  state: {
    currentView: 'planLibrary',
    currentPlan: null,
    currentWeek: null,
    currentDay: null,
    exercises: [],
    timerManager: new TimerManager(),
    workoutStartTime: null,
    workoutTimerInterval: null,
    eventListeners: [], // Track listeners for cleanup
    isInitialized: false, // Track if app has completed initialization
    wasBlurred: false, // Track if window was blurred to prevent initial focus event
    exerciseTimers: {} // Track individual exercise timers to prevent multiple instances
  },

  // DOM Elements cache
  elements: {},

  // Initialize the application
  init() {
    // Setup global error handlers first
    this.setupGlobalErrorHandlers();

    // Register service worker for PWA support
    this.registerServiceWorker();

    // Cache DOM elements
    this.cacheElements();

    // Initialize theme
    this.initTheme();

    // Setup event listeners
    this.setupEventListeners();

    // Setup page lifecycle handlers for mobile
    this.setupPageLifecycleHandlers();

    // Load saved session if exists
    this.loadSession();

    // Show initial view
    this.showView('planLibrary');

    // Mark app as initialized
    this.state.isInitialized = true;
  },

  // Register Service Worker for PWA functionality
  registerServiceWorker() {
    // Only register service worker on http/https protocols
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.protocol === 'http:')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((registration) => {
            // Check for updates periodically
            setInterval(() => {
              registration.update();
            }, 60 * 60 * 1000); // Check every hour
          })
          .catch((error) => {
            console.error('[App] Service Worker registration failed:', error);
          });
      });

      // Listen for service worker updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[App] New service worker activated');
      });
    }
  },

  // Setup global error handlers
  setupGlobalErrorHandlers() {
    // Global error handler
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.showToast('An error occurred. Please refresh the page.', 'error');
      // Optionally log to external service
      return false; // Allow default handling
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.showToast('An unexpected error occurred.', 'error');
      event.preventDefault();
    });

    // LocalStorage error wrapper
    Storage.setErrorHandler((error) => {
      console.error('Storage error:', error);
      this.showToast('Unable to save progress. Check storage availability.', 'error');
    });
  },

  // Add event listener with tracking for cleanup
  addTrackedListener(element, event, handler, options) {
    if (!element) {
      console.warn('Attempted to add listener to null element');
      return;
    }

    element.addEventListener(event, handler, options);
    this.state.eventListeners.push({ element, event, handler, options });
  },

  // Clean up event listeners
  cleanupEventListeners() {
    this.state.eventListeners.forEach(({ element, event, handler, options }) => {
      if (element && element.removeEventListener) {
        element.removeEventListener(event, handler, options);
      }
    });
    this.state.eventListeners = [];
  },

  // Cache frequently used DOM elements
  cacheElements() {
    this.elements = {
      // Header
      header: document.getElementById('header'),
      headerTitle: document.getElementById('headerTitle'),
      headerTitleGroup: document.getElementById('headerTitleGroup'),
      backBtn: document.getElementById('backBtn'),
      settingsBtn: document.getElementById('settingsBtn'),

      // Breadcrumb
      breadcrumb: document.getElementById('breadcrumb'),
      breadcrumbPlan: document.getElementById('breadcrumbPlan'),
      breadcrumbWeek: document.getElementById('breadcrumbWeek'),
      breadcrumbDay: document.getElementById('breadcrumbDay'),

      // Views
      planLibraryView: document.getElementById('planLibraryView'),
      weekSelectorView: document.getElementById('weekSelectorView'),
      daySelectorView: document.getElementById('daySelectorView'),
      workoutView: document.getElementById('workoutView'),
      exerciseLibraryView: document.getElementById('exerciseLibraryView'),
      customWorkoutView: document.getElementById('customWorkoutView'),

      // Workout view elements
      workoutTitle: document.getElementById('workoutTitle'),
      workoutDuration: document.getElementById('workoutDuration'),
      workoutProgress: document.getElementById('workoutProgress'),
      workoutTimer: document.getElementById('workoutTimer'),
      playPauseBtn: document.getElementById('playPauseBtn'),
      resetTimerBtn: document.getElementById('resetTimerBtn'),
      exerciseList: document.getElementById('exerciseList'),

      // Week/Day grids
      weekGrid: document.getElementById('weekGrid'),
      dayGrid: document.getElementById('dayGrid'),
      weekTitle: document.getElementById('weekTitle'),

      // Exercise Library
      exerciseSearch: document.getElementById('exerciseSearch'),
      exerciseGrid: document.getElementById('exerciseGrid'),

      // Modal
      modal: document.getElementById('modal'),
      modalBody: document.getElementById('modalBody'),

      // Settings Modal
      settingsModal: document.getElementById('settingsModal'),
      settingsClose: document.getElementById('settingsClose'),
      globalDurationPreference: document.getElementById('globalDurationPreference'),

      // Toast
      toast: document.getElementById('toast')
    };
  },

  // Setup event listeners
  setupEventListeners() {
    // Back button
    this.elements.backBtn.addEventListener('click', () => this.handleBack());

    // Header title - click to go home
    this.elements.headerTitleGroup.addEventListener('click', () => this.goHome());
    this.elements.headerTitleGroup.style.cursor = 'pointer';

    // Settings button
    this.elements.settingsBtn.addEventListener('click', () => this.openSettings());

    // Plan cards
    document.querySelectorAll('.plan-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const plan = e.currentTarget.dataset.plan;
        this.handlePlanSelect(plan);
      });
    });


    // Timer controls
    if (this.elements.playPauseBtn) {
      this.elements.playPauseBtn.addEventListener('click', () => this.toggleWorkoutTimer());
    }
    if (this.elements.resetTimerBtn) {
      this.elements.resetTimerBtn.addEventListener('click', () => this.resetWorkoutTimer());
    }

    // Custom workout add exercise button
    const addExerciseBtn = document.getElementById('addExerciseBtn');
    if (addExerciseBtn) {
      addExerciseBtn.addEventListener('click', () => this.showExercisePicker());
    }

    // Modal close
    const modalClose = document.querySelector('.modal-close');
    if (modalClose) {
      modalClose.addEventListener('click', () => this.closeModal());
    }

    // Click outside modal to close
    this.elements.modal.addEventListener('click', (e) => {
      if (e.target === this.elements.modal) {
        this.closeModal();
      }
    });

    // Settings modal
    if (this.elements.settingsClose) {
      this.elements.settingsClose.addEventListener('click', () => this.closeSettings());
    }

    if (this.elements.settingsModal) {
      this.elements.settingsModal.addEventListener('click', (e) => {
        if (e.target === this.elements.settingsModal) {
          this.closeSettings();
        }
      });
    }

    // Duration preference toggle in settings
    if (this.elements.globalDurationPreference) {
      this.elements.globalDurationPreference.addEventListener('change', (e) => {
        this.handleSettingsDurationChange(e.target.checked);
      });
    }

    // Theme selection buttons in settings
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const themeBtn = e.currentTarget;
        const themeName = themeBtn.dataset.theme;
        this.setTheme(themeName);

        // Update active state
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        themeBtn.classList.add('active');
      });
    });

    // Exercise search
    if (this.elements.exerciseSearch) {
      this.elements.exerciseSearch.addEventListener('input', (e) => {
        this.handleExerciseSearch(e.target.value);
      });
    }

    // Filter chips
    document.querySelectorAll('.filter-chips .chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        this.handleFilterChange(e.currentTarget);
      });
    });

    // Global duration preference toggle
    const globalDurationToggle = document.getElementById('globalDurationPreference');
    if (globalDurationToggle) {
      globalDurationToggle.addEventListener('change', () => {
        this.handleGlobalDurationChange();
      });
    }
  },

  // Setup page lifecycle handlers for mobile browsers
  setupPageLifecycleHandlers() {
    // Handle page visibility changes (app backgrounding/foregrounding)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.state.isInitialized) {
        // Page became visible again - restore dynamic event listeners
        console.log('[App] Page visible - restoring event listeners');
        this.restoreDynamicEventListeners();
      }
    });

    // Handle page show event (iOS Safari back/forward cache)
    window.addEventListener('pageshow', (event) => {
      if (event.persisted && this.state.isInitialized) {
        // Page was loaded from bfcache - restore event listeners
        console.log('[App] Page restored from cache - restoring event listeners');
        this.restoreDynamicEventListeners();
      }
    });

    // Track when window loses focus
    window.addEventListener('blur', () => {
      this.state.wasBlurred = true;
    });

    // Handle app resume on mobile (for PWAs)
    window.addEventListener('focus', () => {
      // Only restore if we previously lost focus AND app is initialized
      if (this.state.wasBlurred && this.state.isInitialized) {
        console.log('[App] Window focused - restoring event listeners');
        this.restoreDynamicEventListeners();
      }
    });
  },

  // Restore event listeners on dynamically created elements
  restoreDynamicEventListeners() {
    // Safety check: ensure required data is loaded and not null
    if (typeof EIGHT_WEEK_PROGRAM === 'undefined' || !EIGHT_WEEK_PROGRAM ||
        typeof MATCH_DAY_PROTOCOL === 'undefined' || !MATCH_DAY_PROTOCOL ||
        typeof NUTRITION_PLAN === 'undefined' || !NUTRITION_PLAN) {
      console.warn('[App] Data not loaded yet, skipping event listener restoration');
      return;
    }

    // Re-attach listeners to plan cards
    document.querySelectorAll('.plan-card').forEach(card => {
      // Remove old listener first (if any) by cloning the node
      const newCard = card.cloneNode(true);
      card.parentNode.replaceChild(newCard, card);

      // Add fresh listener
      newCard.addEventListener('click', (e) => {
        const plan = e.currentTarget.dataset.plan;
        this.handlePlanSelect(plan);
      });
    });

    // Re-attach listeners to week cards
    document.querySelectorAll('.week-card').forEach(card => {
      const newCard = card.cloneNode(true);
      card.parentNode.replaceChild(newCard, card);

      // Check if it's in week selector view
      if (this.state.currentView === 'weekSelector') {
        const weekNum = Array.from(card.parentNode.children).indexOf(newCard) + 1;
        newCard.addEventListener('click', () => {
          this.state.currentWeek = weekNum;
          this.showWeekDays(weekNum);
        });
      }
      // Check if it's in match day protocol view
      else if (this.state.currentView === 'matchDayProtocol') {
        const protocols = MATCH_DAY_PROTOCOL.protocols || [];
        const index = Array.from(newCard.parentNode.children).indexOf(newCard);
        if (protocols[index]) {
          newCard.addEventListener('click', () => {
            this.loadProtocolChecklist(protocols[index]);
          });
        }
      }
      // Check if it's in nutrition plan view
      else if (this.state.currentView === 'nutritionPlan') {
        const categories = NUTRITION_PLAN.categories || [];
        const index = Array.from(newCard.parentNode.children).indexOf(newCard);
        if (categories[index]) {
          newCard.addEventListener('click', () => {
            this.loadNutritionCategory(categories[index]);
          });
        }
      }
    });

    // Re-attach listeners to day cards
    document.querySelectorAll('.day-card').forEach(card => {
      const newCard = card.cloneNode(true);
      card.parentNode.replaceChild(newCard, card);

      if (this.state.currentWeek) {
        const weekKey = `week${this.state.currentWeek}`;
        const weekData = EIGHT_WEEK_PROGRAM.program[weekKey];
        const days = ['monday', 'tuesday', 'thursday', 'friday'];
        const index = Array.from(newCard.parentNode.children).indexOf(newCard);
        const day = days[index];

        if (weekData && weekData[day]) {
          newCard.addEventListener('click', () => {
            this.state.currentDay = day;
            this.loadWorkout(this.state.currentWeek, day, weekData[day]);
          });
        }
      }
    });

    // Re-attach breadcrumb listeners
    if (this.elements.breadcrumbPlan && this.state.currentPlan) {
      const plan = this.state.currentPlan;
      this.elements.breadcrumbPlan.onclick = (e) => {
        e.preventDefault();
        if (plan === '8-week') {
          this.show8WeekProgram();
        } else if (plan === 'match-day') {
          this.showMatchDayProtocol();
        } else if (plan === 'nutrition') {
          this.showNutritionPlan();
        }
      };
    }

    if (this.elements.breadcrumbWeek && this.state.currentWeek) {
      this.elements.breadcrumbWeek.onclick = (e) => {
        e.preventDefault();
        this.showWeekDays(this.state.currentWeek);
      };
    }

    console.log('[App] Dynamic event listeners restored');
  },

  // ===================================
  // VIEW MANAGEMENT
  // ===================================

  showView(viewName) {
    // Stop workout timer if leaving workout view
    if (this.state.currentView === 'workout' && viewName !== 'workout') {
      this.stopWorkoutTimer();
    }

    // Stop all timers in timer manager
    if (this.state.timerManager) {
      this.state.timerManager.stopAll();
    }

    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
      view.classList.remove('active');
    });

    // Show target view
    const targetView = document.getElementById(`${viewName}View`);
    if (targetView) {
      targetView.classList.add('active');
      this.state.currentView = viewName;
    }

    // Update header
    this.updateHeader(viewName);
  },

  updateHeader(viewName) {
    const backBtn = this.elements.backBtn;
    const title = this.elements.headerTitle;

    // Show/hide back button
    if (viewName === 'planLibrary') {
      backBtn.style.display = 'none';
    } else {
      backBtn.style.display = 'flex';
    }

    // Keep title constant across all views
    title.textContent = 'Tennis Conditioning Pro';
  },

  goHome() {
    this.showView('planLibrary');
    this.updateBreadcrumb(); // Reset breadcrumb on home
  },

  updateBreadcrumb(plan = null, week = null, day = null) {
    const breadcrumb = this.elements.breadcrumb;
    const planEl = this.elements.breadcrumbPlan;
    const weekEl = this.elements.breadcrumbWeek;
    const dayEl = this.elements.breadcrumbDay;

    // Hide all separators first
    const separators = breadcrumb.querySelectorAll('.breadcrumb-separator');

    if (!plan) {
      // No breadcrumb on home screen
      breadcrumb.style.display = 'none';
      return;
    }

    breadcrumb.style.display = 'flex';

    // Set plan name
    const planNames = {
      '8-week': '8-Week Program',
      'match-day': 'Match Day Protocol',
      'nutrition': 'Nutrition Guide',
      'warmup': 'Warm-Up Protocol',
      'cooldown': 'Cool-Down Protocol',
      'exercises': 'Exercise Library',
      'custom': 'Custom Workout'
    };
    planEl.textContent = planNames[plan] || plan;
    planEl.style.display = 'inline';

    // Add click handler to plan breadcrumb
    planEl.onclick = (e) => {
      e.preventDefault();
      if (plan === '8-week') {
        this.show8WeekProgram();
      } else if (plan === 'match-day') {
        this.showMatchDayProtocol();
      } else if (plan === 'nutrition') {
        this.showNutritionPlan();
      }
    };

    // Set week
    if (week) {
      weekEl.textContent = `Week ${week}`;
      weekEl.style.display = 'inline';
      separators[0].style.display = 'inline';

      // Add click handler to week breadcrumb
      weekEl.onclick = (e) => {
        e.preventDefault();
        this.showWeekDays(week);
      };
    } else {
      weekEl.style.display = 'none';
      separators[0].style.display = 'none';
      weekEl.onclick = null;
    }

    // Set day
    if (day) {
      const dayNames = {
        'monday': 'Monday',
        'tuesday': 'Tuesday',
        'thursday': 'Thursday',
        'friday': 'Friday'
      };
      dayEl.textContent = dayNames[day] || day;
      dayEl.style.display = 'inline';
      separators[1].style.display = 'inline';
    } else {
      dayEl.style.display = 'none';
      separators[1].style.display = 'none';
    }
  },

  async handleBack() {
    const currentView = this.state.currentView;

    // Check if leaving an active workout
    if (currentView === 'workout' && window.AppFeatures && window.AppFeatures.isWorkoutActive) {
      const confirmed = await window.AppFeatures.confirmLeaveWorkout();
      if (!confirmed) {
        return; // User cancelled
      }
    }

    switch (currentView) {
      case 'weekSelector':
      case 'matchDayProtocol':
      case 'nutritionPlan':
      case 'exerciseLibrary':
      case 'customWorkout':
        this.showView('planLibrary');
        break;
      case 'daySelector':
        this.showView('weekSelector');
        break;
      case 'workout':
        if (this.state.currentPlan === '8-week') {
          this.showView('daySelector');
        } else if (this.state.currentPlan === 'match-day') {
          this.showMatchDayProtocol();
        } else if (this.state.currentPlan === 'nutrition') {
          this.showNutritionPlan();
        } else {
          this.showView('planLibrary');
        }
        break;
      default:
        this.showView('planLibrary');
    }
  },

  // ===================================
  // PLAN SELECTION
  // ===================================

  handlePlanSelect(plan) {
    this.state.currentPlan = plan;

    switch (plan) {
      case '8-week':
        this.show8WeekProgram();
        break;
      case 'match-day':
        this.showMatchDayProtocol();
        break;
      case 'nutrition':
        this.showNutritionPlan();
        break;
      case 'warmup':
        this.showWorkout(WARMUP_PROTOCOL);
        break;
      case 'cooldown':
        this.showWorkout(COOLDOWN_PROTOCOL);
        break;
      case 'exercises':
        this.showExerciseLibrary();
        break;
      case 'custom':
        this.showCustomWorkout();
        break;
    }
  },

  // ===================================
  // 8-WEEK PROGRAM
  // ===================================

  show8WeekProgram() {
    this.renderWeekSelector();
    this.showView('weekSelector');
    this.updateBreadcrumb('8-week');
  },

  renderWeekSelector() {
    const grid = this.elements.weekGrid;
    grid.innerHTML = '';

    for (let i = 1; i <= 8; i++) {
      const weekKey = `week${i}`;
      const weekData = EIGHT_WEEK_PROGRAM.program[weekKey];
      const completion = Storage.getWeekCompletion(weekKey);
      const isInProgress = Storage.isWeekInProgress(i);

      const card = document.createElement('div');
      card.className = 'week-card';

      if (completion.completed === 4) {
        card.classList.add('completed');
      } else if (isInProgress) {
        card.classList.add('in-progress');
      }

      card.innerHTML = `
        <div class="week-number">Week ${i}</div>
        <div class="week-phase">${weekData.phase}</div>
        <div class="week-progress">${completion.completed}/4 days</div>
      `;

      card.addEventListener('click', () => {
        this.state.currentWeek = i;
        this.showWeekDays(i);
      });

      grid.appendChild(card);
    }
  },

  showWeekDays(weekNum) {
    this.renderDaySelector(weekNum);
    this.elements.weekTitle.textContent = `Week ${weekNum}`;
    this.showView('daySelector');
    this.updateBreadcrumb('8-week', weekNum);
  },

  renderDaySelector(weekNum) {
    const grid = this.elements.dayGrid;
    grid.innerHTML = '';

    const weekKey = `week${weekNum}`;
    const weekData = EIGHT_WEEK_PROGRAM.program[weekKey];
    const days = ['monday', 'tuesday', 'thursday', 'friday'];

    days.forEach(day => {
      const dayData = weekData[day];
      const isCompleted = Storage.isWorkoutCompleted('8-week', weekKey, day);

      const card = document.createElement('div');
      card.className = 'day-card';

      if (isCompleted) {
        card.classList.add('completed');
      }

      card.innerHTML = `
        <div class="day-name">${dayData.day}</div>
        <div class="day-focus">${dayData.focus}</div>
        <div class="day-duration">${dayData.totalTime} min</div>
      `;

      card.addEventListener('click', () => {
        this.state.currentDay = day;
        this.loadWorkout(weekNum, day, dayData);
      });

      grid.appendChild(card);
    });
  },

  // ===================================
  // MATCH DAY PROTOCOL
  // ===================================

  showMatchDayProtocol() {
    this.renderProtocolSelector();
    this.showView('matchDayProtocol');
    this.updateBreadcrumb('match-day');
  },

  renderProtocolSelector() {
    const grid = document.getElementById('protocolGrid');
    if (!grid) return;

    grid.innerHTML = '';

    // Get protocols from data
    const protocols = MATCH_DAY_PROTOCOL.protocols || [];

    protocols.forEach((protocol, index) => {
      const card = document.createElement('div');
      card.className = 'week-card'; // Reuse week-card styling

      card.innerHTML = `
        <div class="week-number">${protocol.icon || '📋'}</div>
        <div class="week-phase">${protocol.name}</div>
        <div class="protocol-subtitle" style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 4px;">${protocol.subtitle || ''}</div>
      `;

      card.addEventListener('click', () => {
        this.loadProtocolChecklist(protocol);
      });

      grid.appendChild(card);
    });
  },

  loadProtocolChecklist(protocol) {
    // Start session for tracking checklist progress
    Storage.startSession('match-day', protocol.id, null);

    this.state.currentPlan = 'match-day';
    this.state.currentProtocol = protocol;
    this.state.exercises = []; // Clear exercises
    this.state.sections = protocol.sections || [];

    this.elements.workoutTitle.textContent = protocol.name;
    this.elements.workoutDuration.textContent = protocol.subtitle || '';

    // Render checklist
    this.renderChecklistSections();

    this.showView('workout');
    this.updateBreadcrumb('match-day', null, protocol.name);
  },

  renderChecklistSections() {
    const list = this.elements.exerciseList;
    this.cleanupEventListeners();
    list.innerHTML = '';

    if (!this.state.sections || this.state.sections.length === 0) {
      list.innerHTML = '<div class="empty-state"><p>No checklist items available</p></div>';
      return;
    }

    let itemIndex = 0;

    this.state.sections.forEach((section, sectionIdx) => {
      const sectionContainer = document.createElement('div');
      sectionContainer.className = 'section-container';

      // Create section header
      const sectionHeader = document.createElement('div');
      sectionHeader.className = sectionIdx === 0 ? 'section-header-card' : 'section-header-card collapsed';

      const itemCount = section.items?.length || 0;

      sectionHeader.innerHTML = `
        <div class="section-header-top">
          <h3>${section.name}</h3>
          <span class="section-progress">0/${itemCount}</span>
          <svg class="section-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        ${section.subtitle ? `<p class="section-meta">${section.subtitle}</p>` : ''}
      `;

      // Toggle handler
      const toggleHandler = () => {
        const isCurrentlyCollapsed = sectionHeader.classList.contains('collapsed');

        // Close all other sections (accordion behavior)
        document.querySelectorAll('.section-header-card').forEach(header => {
          if (header !== sectionHeader) {
            header.classList.add('collapsed');
            const otherItems = header.parentElement.querySelector('.section-checklist-items');
            if (otherItems) otherItems.classList.add('hidden');
          }
        });

        // Toggle this section
        if (isCurrentlyCollapsed) {
          sectionHeader.classList.remove('collapsed');
          itemsContainer.classList.remove('hidden');
        } else {
          sectionHeader.classList.add('collapsed');
          itemsContainer.classList.add('hidden');
        }
      };
      this.addTrackedListener(sectionHeader, 'click', toggleHandler);

      sectionContainer.appendChild(sectionHeader);

      // Create items container
      const itemsContainer = document.createElement('div');
      itemsContainer.className = sectionIdx === 0 ? 'section-checklist-items' : 'section-checklist-items hidden';

      // Add checklist items
      if (section.items && section.items.length > 0) {
        section.items.forEach((item) => {
          const itemCard = this.createChecklistItem(item, itemIndex);
          itemsContainer.appendChild(itemCard);
          itemIndex++;
        });
      }

      sectionContainer.appendChild(itemsContainer);
      list.appendChild(sectionContainer);
    });

    // Update section progress counters
    this.updateChecklistSectionProgress();
  },

  createChecklistItem(item, index) {
    const card = document.createElement('div');
    card.className = 'exercise-card checklist-item';
    card.dataset.index = index;

    const isChecked = Storage.isExerciseCompleted(index);
    if (isChecked) {
      card.classList.add('completed');
    }

    card.innerHTML = `
      <div class="exercise-header">
        <div class="exercise-checkbox ${isChecked ? 'checked' : ''}" data-index="${index}"></div>
        <div class="exercise-info">
          <div class="exercise-name">${item.text}</div>
          ${item.details ? `<div class="exercise-details" style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">${item.details}</div>` : ''}
        </div>
      </div>
    `;

    // Add checkbox click handler
    const checkbox = card.querySelector('.exercise-checkbox');
    if (checkbox) {
      const checkboxHandler = (e) => {
        e.stopPropagation();
        this.toggleChecklistItem(index);
      };
      this.addTrackedListener(checkbox, 'click', checkboxHandler);
    }

    return card;
  },

  toggleChecklistItem(index) {
    Storage.toggleExercise(index);

    // Update UI
    const card = document.querySelector(`[data-index="${index}"]`);
    const checkbox = card?.querySelector('.exercise-checkbox');

    if (checkbox) {
      const isChecked = Storage.isExerciseCompleted(index);
      checkbox.classList.toggle('checked', isChecked);
      card.classList.toggle('completed', isChecked);

      // Play audio feedback
      if (window.AppFeatures && isChecked) {
        window.AppFeatures.playSuccess();
      }
    }

    // Update section progress
    this.updateChecklistSectionProgress();

    // Show celebration if item checked
    if (Storage.isExerciseCompleted(index)) {
      this.showToast('Item checked! ✓');
    }
  },

  updateChecklistSectionProgress() {
    document.querySelectorAll('.section-header-card').forEach((header, sectionIdx) => {
      const section = this.state.sections[sectionIdx];
      if (!section || !section.items) return;

      const totalItems = section.items.length;
      let completedItems = 0;

      // Count completed items in this section
      const itemsContainer = header.parentElement.querySelector('.section-checklist-items');
      if (itemsContainer) {
        itemsContainer.querySelectorAll('.checklist-item.completed').forEach(() => {
          completedItems++;
        });
      }

      // Update progress display
      const progressSpan = header.querySelector('.section-progress');
      if (progressSpan) {
        progressSpan.textContent = `${completedItems}/${totalItems}`;
      }
    });
  },

  // ===================================
  // NUTRITION PLAN
  // ===================================

  showNutritionPlan() {
    this.renderNutritionCategories();
    this.showView('nutritionPlan');
    this.updateBreadcrumb('nutrition');
  },

  renderNutritionCategories() {
    const grid = document.getElementById('nutritionGrid');
    if (!grid) return;

    grid.innerHTML = '';
    const categories = NUTRITION_PLAN.categories || [];

    categories.forEach((category, index) => {
      const card = document.createElement('div');
      card.className = 'week-card';
      card.innerHTML = `
        <div class="week-number">${category.icon || '📋'}</div>
        <div class="week-phase">${category.name}</div>
        <div class="protocol-subtitle">${category.subtitle || ''}</div>
      `;

      card.addEventListener('click', () => {
        this.loadNutritionCategory(category);
      });

      grid.appendChild(card);
    });
  },

  loadNutritionCategory(category) {
    this.state.currentPlan = 'nutrition';
    this.state.currentCategory = category;
    this.state.sections = category.sections || [];

    this.elements.workoutTitle.textContent = category.name;
    this.elements.workoutDuration.textContent = category.subtitle || '';
    this.elements.workoutProgress.style.display = 'none'; // Hide progress for info view

    // Render nutrition items
    this.renderNutritionItems();

    this.showView('workout');
    this.updateBreadcrumb('nutrition', null, category.name);
  },

  renderNutritionItems() {
    const list = this.elements.exerciseList;
    list.innerHTML = '';

    const category = this.state.currentCategory;
    if (!category || !category.sections) return;

    category.sections.forEach((section, sectionIndex) => {
      // Create section header
      const sectionHeader = document.createElement('div');
      sectionHeader.className = 'section-checklist-header';
      sectionHeader.innerHTML = `
        <h3 class="section-checklist-title">${section.name}</h3>
      `;

      // Create section container
      const sectionContainer = document.createElement('div');
      sectionContainer.className = 'section-checklist-items';
      sectionContainer.style.display = 'block'; // Always expanded for nutrition

      // Add items
      section.items.forEach((item, itemIndex) => {
        const itemCard = this.createNutritionItem(item, `${sectionIndex}-${itemIndex}`);
        sectionContainer.appendChild(itemCard);
      });

      list.appendChild(sectionHeader);
      list.appendChild(sectionContainer);
    });
  },

  createNutritionItem(item, id) {
    const card = document.createElement('div');
    card.className = 'exercise-card nutrition-item';
    card.dataset.id = id;

    let macrosHTML = '';
    if (item.macros) {
      macrosHTML = `
        <div class="nutrition-macros">
          <span>${item.macros.calories || 0} cal</span>
          <span>${item.macros.carbs || 0}g carbs</span>
          <span>${item.macros.protein || 0}g protein</span>
          <span>${item.macros.fat || 0}g fat</span>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="exercise-header">
        <div class="exercise-info">
          <div class="exercise-name">${item.title}</div>
          ${item.content ? `<div class="exercise-details nutrition-content">${item.content}</div>` : ''}
          ${macrosHTML}
        </div>
      </div>
    `;

    return card;
  },

  // ===================================
  // WORKOUT SESSION
  // ===================================

  loadWorkout(week, day, dayData) {
    // Set state
    this.state.currentWeek = week;
    this.state.currentDay = day;

    // Reset workout timer state when loading a new workout
    this.state.workoutStartTime = null;
    this.state.workoutPausedAt = null;
    if (this.state.workoutTimerInterval) {
      clearInterval(this.state.workoutTimerInterval);
      this.state.workoutTimerInterval = null;
    }

    // Mark workout as active and enable wake lock
    if (window.AppFeatures) {
      window.AppFeatures.setWorkoutActive(true);
    }

    // Start session immediately to track progress
    Storage.startSession('8-week', `week${week}`, day);

    // Flatten exercises from sections if present, otherwise use exercises array
    if (dayData.sections) {
      this.state.exercises = [];
      dayData.sections.forEach(section => {
        section.exercises.forEach(ex => {
          this.state.exercises.push({
            ...ex,
            sectionName: section.name,
            sectionTime: section.timeRange,
            sectionDuration: section.duration,
            sectionRounds: section.rounds,
            sectionRest: section.restBetweenRounds
          });
        });
      });
      this.state.sections = dayData.sections;
    } else {
      this.state.exercises = dayData.exercises || [];
      this.state.sections = null;
    }

    // Update UI
    this.elements.workoutTitle.textContent = `${dayData.day} - ${dayData.focus}`;
    this.elements.workoutDuration.textContent = `${dayData.totalTime || dayData.duration} min`;

    // Show workout breakdown
    if (dayData.warmupTime && dayData.mainTime && dayData.cooldownTime) {
      this.elements.workoutDuration.textContent += ` (Warmup: ${dayData.warmupTime} | Main: ${dayData.mainTime} | Cooldown: ${dayData.cooldownTime})`;
    }

    this.updateWorkoutProgress();

    // Render exercises with sections
    this.renderExercises();

    // Update section progress
    this.updateSectionProgress();

    // Initialize timer display (but don't auto-start)
    this.updateWorkoutTimer();
    this.updateTimerButton(false);

    // Show voice-guided button for 8-week program
    this.showVoiceGuidedButton('8-week');

    this.showView('workout');
    this.updateBreadcrumb('8-week', week, day);
  },

  showWorkout(protocol) {
    // Reset workout timer state when loading a new workout
    this.state.workoutStartTime = null;
    this.state.workoutPausedAt = null;
    if (this.state.workoutTimerInterval) {
      clearInterval(this.state.workoutTimerInterval);
      this.state.workoutTimerInterval = null;
    }

    // Start session immediately to track progress
    Storage.startSession(protocol.id, null, null);

    // Flatten exercises from sections with section metadata
    this.state.exercises = [];
    protocol.sections.forEach(section => {
      section.exercises.forEach(ex => {
        this.state.exercises.push({
          ...ex,
          sectionName: section.name,
          sectionTime: section.timeRange,
          sectionDuration: section.duration,
          sectionNote: section.note
        });
      });
    });
    this.state.sections = protocol.sections;

    // Update UI
    this.elements.workoutTitle.textContent = protocol.name;
    this.elements.workoutDuration.textContent = `${protocol.totalTime || protocol.duration} min`;
    this.updateWorkoutProgress();

    // Render exercises with sections
    this.renderExercises();

    // Show voice-guided button for supported plans
    this.showVoiceGuidedButton(protocol.id);

    this.showView('workout');
    this.updateBreadcrumb(protocol.id);
  },

  handleGlobalDurationChange() {
    // Get the current preference (checked = max, unchecked = min)
    const globalToggle = document.getElementById('globalDurationPreference');
    const useMax = globalToggle ? globalToggle.checked : true;

    // Update all exercises with duration ranges
    this.state.exercises.forEach((exercise, index) => {
      const durationRange = this.parseDurationRange(exercise);
      if (durationRange && durationRange.min !== durationRange.max) {
        // Apply preference
        exercise.duration = useMax ? durationRange.max : durationRange.min;
        exercise.useMaxDuration = useMax;

        // Update the timer display for this exercise
        const card = document.querySelector(`.exercise-card[data-index="${index}"]`);
        if (card) {
          const timerEl = card.querySelector('[data-timer-type="exercise"] .timer-time');
          if (timerEl) {
            timerEl.textContent = TimeUtils.formatSeconds(exercise.duration);
          }
        }
      }
    });
  },

  checkAndShowGlobalDurationToggle() {
    const globalToggle = document.getElementById('globalDurationToggle');
    if (!globalToggle) return;

    // Check if any exercise has a duration range
    const hasRanges = this.state.exercises.some(exercise => {
      const range = this.parseDurationRange(exercise);
      return range && range.min !== range.max;
    });

    // Show or hide the toggle
    globalToggle.style.display = hasRanges ? 'flex' : 'none';
  },

  renderExercises() {
    const list = this.elements.exerciseList;

    // Clean up existing event listeners before clearing content
    this.cleanupEventListeners();

    list.innerHTML = '';

    if (this.state.exercises.length === 0) {
      list.innerHTML = '<div class="empty-state"><p>No exercises in this workout</p></div>';
      return;
    }

    // Apply global duration preference to all exercises before rendering
    const globalToggle = document.getElementById('globalDurationPreference');
    const useMax = globalToggle ? globalToggle.checked : true;

    this.state.exercises.forEach(exercise => {
      const durationRange = this.parseDurationRange(exercise);
      if (durationRange && durationRange.min !== durationRange.max) {
        exercise.duration = useMax ? durationRange.max : durationRange.min;
        exercise.useMaxDuration = useMax;
      }
    });

    // If we have sections, group exercises by section
    if (this.state.sections) {
      let exerciseIndex = 0;

      this.state.sections.forEach((section, sectionIdx) => {
        // Create section container
        const sectionContainer = document.createElement('div');
        sectionContainer.className = 'section-container';

        // Create section header
        const sectionHeader = document.createElement('div');
        // Only expand first section, collapse the rest
        sectionHeader.className = sectionIdx === 0 ? 'section-header-card' : 'section-header-card collapsed';
        sectionHeader.dataset.sectionIndex = sectionIdx;

        let sectionMeta = `${section.timeRange} (${section.duration} min)`;
        if (section.rounds) {
          sectionMeta += ` • ${section.rounds} rounds`;
        }
        if (section.restBetweenRounds) {
          sectionMeta += ` • ${section.restBetweenRounds}s rest between rounds`;
        }
        if (section.note) {
          sectionMeta += ` • ${section.note}`;
        }

        const exerciseCount = section.exercises.length;
        const sectionStartIndex = exerciseIndex;
        const sectionEndIndex = exerciseIndex + exerciseCount;
        const exerciseIndices = Array.from({ length: exerciseCount }, (_, i) => sectionStartIndex + i);

        sectionHeader.innerHTML = `
          <div class="section-header-top">
            <h3>${section.name}</h3>
            <span class="section-progress">0/${exerciseCount}</span>
            <svg class="section-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          <p class="section-meta">${sectionMeta}</p>
        `;

        // Store exercise indices for progress tracking
        sectionHeader.setAttribute('data-exercises', exerciseIndices.join(','));

        // Add click handler to toggle collapse - TRACKED
        const toggleHandler = () => {
          const exercisesContainer = sectionContainer.querySelector('.section-exercises');
          const isCurrentlyCollapsed = sectionHeader.classList.contains('collapsed');

          // Close all other sections (accordion behavior)
          document.querySelectorAll('.section-header-card').forEach(header => {
            if (header !== sectionHeader) {
              header.classList.add('collapsed');
              const otherContainer = header.parentElement;
              const otherExercises = otherContainer.querySelector('.section-exercises');
              if (otherExercises) {
                otherExercises.classList.add('hidden');
              }
            }
          });

          // Toggle this section
          if (isCurrentlyCollapsed) {
            sectionHeader.classList.remove('collapsed');
            exercisesContainer.classList.remove('hidden');
          } else {
            sectionHeader.classList.add('collapsed');
            exercisesContainer.classList.add('hidden');
          }
        };
        this.addTrackedListener(sectionHeader, 'click', toggleHandler);

        sectionContainer.appendChild(sectionHeader);

        // Create exercises container (visible only for first section)
        const exercisesContainer = document.createElement('div');
        exercisesContainer.className = sectionIdx === 0 ? 'section-exercises' : 'section-exercises hidden';

        // Add exercises in this section
        section.exercises.forEach(() => {
          const exerciseData = this.state.exercises[exerciseIndex];
          const card = this.createExerciseCard(exerciseData, exerciseIndex);
          exercisesContainer.appendChild(card);
          exerciseIndex++;
        });

        sectionContainer.appendChild(exercisesContainer);
        list.appendChild(sectionContainer);
      });
    } else {
      // Just render exercises
      this.state.exercises.forEach((exerciseData, index) => {
        const card = this.createExerciseCard(exerciseData, index);
        list.appendChild(card);
      });
    }

    // Auto-expand first incomplete exercise
    const firstIncompleteIndex = this.state.exercises.findIndex((_, i) => !Storage.isExerciseCompleted(i));
    if (firstIncompleteIndex !== -1) {
      const firstIncompleteCard = document.querySelector(`[data-index="${firstIncompleteIndex}"]`);
      if (firstIncompleteCard) {
        const expandable = firstIncompleteCard.querySelector('.exercise-expandable');
        if (expandable) {
          expandable.classList.remove('hidden');
        }
      }
    }

    // Check if we should show the global duration toggle
    this.checkAndShowGlobalDurationToggle();
  },

  collapseAllSections() {
    document.querySelectorAll('.section-header-card').forEach(header => {
      header.classList.add('collapsed');
      const container = header.parentElement;
      const exercisesContainer = container.querySelector('.section-exercises');
      if (exercisesContainer) {
        exercisesContainer.classList.add('hidden');
      }
    });
  },

  expandAllSections() {
    document.querySelectorAll('.section-header-card').forEach(header => {
      header.classList.remove('collapsed');
      const container = header.parentElement;
      const exercisesContainer = container.querySelector('.section-exercises');
      if (exercisesContainer) {
        exercisesContainer.classList.remove('hidden');
      }
    });
  },

  createExerciseCard(exerciseData, index) {
    const card = document.createElement('div');
    card.className = 'exercise-card';
    card.dataset.index = index;

    // Get exercise details
    const exercise = EXERCISES[exerciseData.exercise];
    const isCompleted = Storage.isExerciseCompleted(index);

    if (isCompleted) {
      card.classList.add('completed');
    }

    // Build exercise details string
    let detailsHTML = '';

    if (exerciseData.sets) {
      detailsHTML += `<span>${exerciseData.sets} sets</span>`;
    }

    if (exerciseData.reps) {
      const repsText = exerciseData.perSide ? `${exerciseData.reps} reps/side` : `${exerciseData.reps} reps`;
      detailsHTML += `<span>${repsText}</span>`;
    }

    if (exerciseData.duration) {
      detailsHTML += `<span>${exerciseData.duration}s hold</span>`;
    }

    if (exerciseData.distance) {
      detailsHTML += `<span>${exerciseData.distance}</span>`;
    }

    if (exerciseData.rest) {
      detailsHTML += `<span>${exerciseData.rest}s rest</span>`;
    }

    // Video link as button
    const videoLink = exercise?.videoUrl ?
      `<a href="${exercise.videoUrl}" target="_blank" rel="noopener noreferrer" class="video-link-btn" aria-label="Watch video tutorial" onclick="event.stopPropagation()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polygon points="10 8 16 12 10 16 10 8" fill="currentColor"/>
        </svg>
      </a>` : '';

    // Build instructions HTML for expandable section
    // Combine exercise library instructions with exercise-specific instructions
    const allInstructions = [];
    if (exercise?.instructions) {
      allInstructions.push(...exercise.instructions);
    }
    if (exerciseData.instructions && !allInstructions.includes(exerciseData.instructions)) {
      allInstructions.push(exerciseData.instructions);
    }
    if (exerciseData.setup) {
      allInstructions.unshift(`Setup: ${exerciseData.setup}`);
    }

    const instructionsHTML = allInstructions.length > 0
      ? allInstructions.map(inst => `<li>${inst}</li>`).join('')
      : '';

    // Show focus and tips separately, only when they have content
    const focusHTML = exerciseData.focus
      ? `<div class="exercise-focus"><strong>🎯 Focus:</strong> ${exerciseData.focus}</div>`
      : '';

    const tipsHTML = exercise?.tips
      ? `<div class="exercise-tips"><strong>💡 Tips:</strong> ${exercise.tips}</div>`
      : '';

    const expandableContent = instructionsHTML || focusHTML || tipsHTML ? `
      <div class="exercise-expandable hidden">
        ${instructionsHTML ? `
          <div class="exercise-instructions-wrapper">
            <div class="exercise-instructions"><strong>Instructions:</strong><ul>${instructionsHTML}</ul></div>
            ${exercise?.videoUrl ? `
              <a href="${exercise.videoUrl}" target="_blank" rel="noopener noreferrer" class="video-link-btn video-link-btn-instructions" aria-label="Watch video tutorial">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polygon points="10 8 16 12 10 16 10 8" fill="currentColor"/>
                </svg>
              </a>
            ` : ''}
          </div>
        ` : ''}
        ${focusHTML}
        ${tipsHTML}
      </div>
    ` : '';

    // Use exercise name from data, fall back to exercise library name
    const exerciseName = exerciseData.name || exercise?.name || exerciseData.exercise;

    // Create timer controls inline
    const timerHTML = this.createTimerHTML(exerciseData, index);
    const timerControls = timerHTML ? `
      <div class="exercise-inline-controls">
        ${timerHTML}
      </div>
    ` : '';

    card.innerHTML = `
      <div class="exercise-header" style="cursor: pointer;">
        <div class="exercise-checkbox ${isCompleted ? 'checked' : ''}" data-index="${index}">
        </div>
        <div class="exercise-info">
          <div class="exercise-name">${exerciseName}</div>
          <div class="exercise-details">
            ${detailsHTML}
          </div>
        </div>
        ${timerControls}
      </div>
      ${expandableContent}
    `;

    // Add header click to expand/collapse - TRACKED
    const header = card.querySelector('.exercise-header');
    const expandable = card.querySelector('.exercise-expandable');

    if (header && expandable) {
      const expandHandler = (e) => {
        // Don't expand if clicking checkbox, timer controls, or video link
        if (e.target.closest('.exercise-checkbox')) {
          return;
        }
        if (e.target.closest('.exercise-inline-controls')) {
          return;
        }
        if (e.target.closest('.timer-btn')) {
          return;
        }
        if (e.target.closest('.video-link-btn')) {
          return;
        }
        expandable.classList.toggle('hidden');
      };
      this.addTrackedListener(header, 'click', expandHandler);
    }

    // Add checkbox click handler - TRACKED
    const checkbox = card.querySelector('.exercise-checkbox');
    if (checkbox) {
      const checkboxHandler = (e) => {
        e.stopPropagation();
        this.toggleExercise(index);
      };
      this.addTrackedListener(checkbox, 'click', checkboxHandler);
    }

    // Add timer controls if needed
    this.attachTimerControls(card, exerciseData, index);

    return card;
  },

  parseDurationRange(exerciseData) {
    // Check if exerciseData has durationMin and durationMax fields
    if (exerciseData.durationMin && exerciseData.durationMax) {
      return {
        min: exerciseData.durationMin,
        max: exerciseData.durationMax
      };
    }

    // Check if exerciseData has durationRange field (e.g., "20-30")
    if (exerciseData.durationRange) {
      const parts = String(exerciseData.durationRange).split('-');
      if (parts.length === 2) {
        return {
          min: parseInt(parts[0]),
          max: parseInt(parts[1])
        };
      }
    }

    // Check instructions for range pattern (e.g., "20-30 seconds", "Hold each leg 20-30 seconds")
    if (exerciseData.instructions) {
      const instructionText = Array.isArray(exerciseData.instructions)
        ? exerciseData.instructions.join(' ')
        : String(exerciseData.instructions);

      // Match patterns like "20-30 seconds", "20-30 sec", "20-30s"
      const rangeMatch = instructionText.match(/(\d+)\s*-\s*(\d+)\s*(?:seconds?|sec|s\b)/i);
      if (rangeMatch) {
        return {
          min: parseInt(rangeMatch[1]),
          max: parseInt(rangeMatch[2])
        };
      }
    }

    // Check from EXERCISES library instructions
    if (typeof EXERCISES !== 'undefined' && exerciseData.exercise) {
      const exerciseLib = EXERCISES[exerciseData.exercise];

      if (exerciseLib && exerciseLib.instructions) {
        const instructionText = Array.isArray(exerciseLib.instructions)
          ? exerciseLib.instructions.join(' ')
          : String(exerciseLib.instructions);

        const rangeMatch = instructionText.match(/(\d+)\s*-\s*(\d+)\s*(?:seconds?|sec|s\b)/i);
        if (rangeMatch) {
          return {
            min: parseInt(rangeMatch[1]),
            max: parseInt(rangeMatch[2])
          };
        }
      }
    }

    // No range found
    return null;
  },

  createTimerHTML(exerciseData, index) {
    // Only show timer if exercise has duration
    if (!exerciseData.duration && !exerciseData.rest) {
      return '';
    }

    const hasDuration = exerciseData.duration > 0;
    const hasRest = exerciseData.rest > 0;

    let html = '';

    if (hasDuration) {
      html += `
        <div class="timer-section-horizontal" data-timer-type="exercise" data-index="${index}">
          <div class="timer-display-compact">
            <div class="timer-time">${TimeUtils.formatSeconds(exerciseData.duration)}</div>
          </div>
          <div class="timer-controls">
            <button class="timer-btn start" data-action="start" title="Start">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
            <button class="timer-btn pause hidden" data-action="pause" title="Pause">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            </button>
            <button class="timer-btn reset" data-action="reset" title="Reset">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
            </button>
          </div>
          <div class="timer-progress">
            <div class="timer-progress-bar" style="width: 0%"></div>
          </div>
        </div>
      `;
    }

    if (hasRest) {
      html += `
        <div class="rest-timer-horizontal hidden" data-timer-type="rest" data-index="${index}">
          <div class="timer-display-compact">
            <div class="timer-time">${TimeUtils.formatSeconds(exerciseData.rest)}</div>
            <div class="timer-label-small">Rest</div>
          </div>
          <div class="timer-controls">
            <button class="timer-btn start" data-action="start" title="Start">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
            <button class="timer-btn pause hidden" data-action="pause" title="Pause">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            </button>
            <button class="timer-btn reset" data-action="reset" title="Reset">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
            </button>
          </div>
          <div class="timer-progress">
            <div class="timer-progress-bar" style="width: 0%"></div>
          </div>
        </div>
      `;
    }

    return html;
  },

  attachTimerControls(card, exerciseData, index) {
    const exerciseTimerEl = card.querySelector('[data-timer-type="exercise"]');
    const restTimerEl = card.querySelector('[data-timer-type="rest"]');

    // Stop and clean up old exercise timer if it exists
    const oldExerciseTimerKey = `exercise-${index}`;
    if (this.state.exerciseTimers[oldExerciseTimerKey]) {
      this.state.exerciseTimers[oldExerciseTimerKey].stop();
      delete this.state.exerciseTimers[oldExerciseTimerKey];
    }

    // Stop and clean up old rest timer if it exists
    const oldRestTimerKey = `rest-${index}`;
    if (this.state.exerciseTimers[oldRestTimerKey]) {
      this.state.exerciseTimers[oldRestTimerKey].stop();
      delete this.state.exerciseTimers[oldRestTimerKey];
    }

    if (exerciseTimerEl && exerciseData.duration) {
      const timer = new Timer();
      timer.duration = exerciseData.duration;

      // Store timer instance for cleanup
      this.state.exerciseTimers[oldExerciseTimerKey] = timer;
      timer.onTick = (remaining, duration) => {
        const timeEl = exerciseTimerEl.querySelector('.timer-time');
        const progressBar = exerciseTimerEl.querySelector('.timer-progress-bar');

        if (timeEl) {
          timeEl.textContent = TimeUtils.formatSeconds(remaining);
        }

        if (progressBar) {
          const progress = duration > 0 ? ((duration - remaining) / duration) * 100 : 0;
          progressBar.style.width = `${progress}%`;
        }
      };

      timer.onComplete = () => {
        this.showToast('Exercise complete! 💪');

        // Reset timer to initial duration
        const durationRange = this.parseDurationRange(exerciseData);
        if (durationRange) {
          timer.duration = exerciseData.useMaxDuration ? durationRange.max : durationRange.min;
        }
        timer.remaining = timer.duration;

        // Update display to show reset time
        const timeEl = exerciseTimerEl.querySelector('.timer-time');
        if (timeEl) {
          timeEl.textContent = TimeUtils.formatSeconds(timer.duration);
        }

        // Show rest timer if available
        if (restTimerEl && exerciseData.rest) {
          restTimerEl.classList.remove('hidden');
          // Auto-start rest timer would go here
        }
      };

      // Attach button listeners - TRACKED
      const startBtn = exerciseTimerEl.querySelector('[data-action="start"]');
      const pauseBtn = exerciseTimerEl.querySelector('[data-action="pause"]');
      const resetBtn = exerciseTimerEl.querySelector('[data-action="reset"]');

      if (startBtn) {
        this.addTrackedListener(startBtn, 'click', () => {
          timer.start();
          startBtn.classList.add('hidden');
          pauseBtn.classList.remove('hidden');
        });
      }

      if (pauseBtn) {
        this.addTrackedListener(pauseBtn, 'click', () => {
          timer.pause();
          pauseBtn.classList.add('hidden');
          startBtn.classList.remove('hidden');
        });
      }

      if (resetBtn) {
        this.addTrackedListener(resetBtn, 'click', () => {
          timer.reset();
          pauseBtn.classList.add('hidden');
          startBtn.classList.remove('hidden');
        });
      }
    }

    // Similar setup for rest timer
    if (restTimerEl && exerciseData.rest) {
      const timer = new Timer();
      timer.duration = exerciseData.rest;

      // Store timer instance for cleanup
      this.state.exerciseTimers[oldRestTimerKey] = timer;

      timer.onTick = (remaining, duration) => {
        const timeEl = restTimerEl.querySelector('.timer-time');
        const progressBar = restTimerEl.querySelector('.timer-progress-bar');

        if (timeEl) {
          timeEl.textContent = TimeUtils.formatSeconds(remaining);
        }

        if (progressBar) {
          const progress = duration > 0 ? ((duration - remaining) / duration) * 100 : 0;
          progressBar.style.width = `${progress}%`;
        }
      };

      timer.onComplete = () => {
        this.showToast('Rest complete! Ready for next exercise 🎾');

        // Reset timer to initial duration
        timer.remaining = timer.duration;

        // Update display to show reset time
        const timeEl = restTimerEl.querySelector('.timer-time');
        if (timeEl) {
          timeEl.textContent = TimeUtils.formatSeconds(timer.duration);
        }

        restTimerEl.classList.add('hidden');
      };

      const startBtn = restTimerEl.querySelector('[data-action="start"]');
      const pauseBtn = restTimerEl.querySelector('[data-action="pause"]');
      const resetBtn = restTimerEl.querySelector('[data-action="reset"]');

      if (startBtn) {
        this.addTrackedListener(startBtn, 'click', () => {
          timer.start();
          startBtn.classList.add('hidden');
          pauseBtn.classList.remove('hidden');
        });
      }

      if (pauseBtn) {
        this.addTrackedListener(pauseBtn, 'click', () => {
          timer.pause();
          pauseBtn.classList.add('hidden');
          startBtn.classList.remove('hidden');
        });
      }

      if (resetBtn) {
        this.addTrackedListener(resetBtn, 'click', () => {
          timer.reset();
          pauseBtn.classList.add('hidden');
          startBtn.classList.remove('hidden');
        });
      }
    }
  },

  toggleExercise(index) {
    Storage.toggleExercise(index);

    // Update UI
    const card = document.querySelector(`[data-index="${index}"]`);
    const checkbox = card?.querySelector('.exercise-checkbox');

    if (checkbox) {
      const isCompleted = Storage.isExerciseCompleted(index);
      checkbox.classList.toggle('checked', isCompleted);
      card.classList.toggle('completed', isCompleted);
    }

    // Update progress
    this.updateWorkoutProgress();
    this.updateSectionProgress();

    // Show feedback with celebration
    if (Storage.isExerciseCompleted(index)) {
      this.celebrate();
      const completed = this.state.exercises.filter((_, i) => Storage.isExerciseCompleted(i)).length;
      const total = this.state.exercises.length;
      this.showToast(`Exercise completed! ${completed}/${total} done ✓`);

      // Check if all exercises are now completed
      if (completed === total && total > 0) {
        setTimeout(() => {
          this.showWorkoutCompletionSummary();
        }, 500); // Small delay to let the toast show first
      }

      // Collapse current exercise and expand next
      const currentExpandable = card?.querySelector('.exercise-expandable');
      if (currentExpandable && !currentExpandable.classList.contains('hidden')) {
        currentExpandable.classList.add('hidden');
      }

      // Check if current section is complete and open next section if so
      if (this.state.sections) {
        const sectionInfo = this.getSectionForExercise(index);
        if (sectionInfo && this.isSectionComplete(sectionInfo.sectionIndex)) {
          this.openNextSection(sectionInfo.sectionIndex);
          return; // Skip opening next exercise in same section
        }
      }

      // Find and expand next exercise (if not moving to next section)
      const nextCard = document.querySelector(`[data-index="${index + 1}"]`);
      if (nextCard) {
        const nextExpandable = nextCard.querySelector('.exercise-expandable');
        if (nextExpandable && nextExpandable.classList.contains('hidden')) {
          nextExpandable.classList.remove('hidden');

          // Scroll next exercise into view
          setTimeout(() => {
            nextCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 100);
        }
      }
    }
  },

  // Helper: Get section info for an exercise index
  getSectionForExercise(exerciseIndex) {
    if (!this.state.sections) return null;

    let currentExerciseCount = 0;
    for (let sectionIndex = 0; sectionIndex < this.state.sections.length; sectionIndex++) {
      const section = this.state.sections[sectionIndex];
      const sectionExerciseCount = section.exercises.length;

      if (exerciseIndex < currentExerciseCount + sectionExerciseCount) {
        return {
          sectionIndex,
          exerciseIndexInSection: exerciseIndex - currentExerciseCount,
          startExerciseIndex: currentExerciseCount,
          endExerciseIndex: currentExerciseCount + sectionExerciseCount - 1
        };
      }

      currentExerciseCount += sectionExerciseCount;
    }

    return null;
  },

  // Helper: Check if all exercises in a section are complete
  isSectionComplete(sectionIndex) {
    if (!this.state.sections || sectionIndex >= this.state.sections.length) return false;

    const sectionInfo = this.getSectionForExercise(this.getSectionStartIndex(sectionIndex));
    if (!sectionInfo) return false;

    for (let i = sectionInfo.startExerciseIndex; i <= sectionInfo.endExerciseIndex; i++) {
      if (!Storage.isExerciseCompleted(i)) {
        return false;
      }
    }

    return true;
  },

  // Helper: Get starting exercise index for a section
  getSectionStartIndex(sectionIndex) {
    let count = 0;
    for (let i = 0; i < sectionIndex; i++) {
      count += this.state.sections[i].exercises.length;
    }
    return count;
  },

  // Helper: Open next section and expand its first exercise
  openNextSection(currentSectionIndex) {
    const nextSectionIndex = currentSectionIndex + 1;
    if (!this.state.sections || nextSectionIndex >= this.state.sections.length) {
      return; // No next section
    }

    // Find and expand the next section header
    const sectionHeaders = document.querySelectorAll('.section-header-card');
    if (sectionHeaders[nextSectionIndex]) {
      const nextSectionHeader = sectionHeaders[nextSectionIndex];

      // Collapse all sections first
      sectionHeaders.forEach(header => {
        header.classList.add('collapsed');
        const container = header.parentElement;
        const exercisesContainer = container.querySelector('.section-exercises');
        if (exercisesContainer) {
          exercisesContainer.classList.add('hidden');
        }
      });

      // Expand the next section
      nextSectionHeader.classList.remove('collapsed');
      const nextSectionContainer = nextSectionHeader.parentElement;
      const nextExercisesContainer = nextSectionContainer.querySelector('.section-exercises');
      if (nextExercisesContainer) {
        nextExercisesContainer.classList.remove('hidden');
      }

      // Find and expand first exercise in next section
      const firstExerciseIndex = this.getSectionStartIndex(nextSectionIndex);
      const firstExerciseCard = document.querySelector(`[data-index="${firstExerciseIndex}"]`);

      if (firstExerciseCard) {
        const expandable = firstExerciseCard.querySelector('.exercise-expandable');
        if (expandable) {
          expandable.classList.remove('hidden');
        }

        // Scroll to next section
        setTimeout(() => {
          nextSectionHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  },

  updateWorkoutProgress() {
    const total = this.state.exercises.length;
    const completed = Storage.getCompletedCount();

    this.elements.workoutProgress.textContent = `${completed}/${total} exercises`;
  },

  showWorkoutCompletionSummary() {
    // Stop the workout timer
    const duration = this.stopWorkoutTimer();
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;

    // Play success sound if available
    if (window.AppFeatures) {
      window.AppFeatures.playSuccess();
    }

    // Show completion modal
    const emojis = ['🎉', '🎊', '💪', '🏆', '🌟', '✨', '🎯'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

    const messages = [
      'Awesome workout!',
      'Great job!',
      'You crushed it!',
      'Outstanding performance!',
      'Fantastic work!',
      'Well done!',
      'Superb effort!'
    ];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    this.elements.modalBody.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 64px; margin-bottom: 16px;">${randomEmoji}</div>
        <h2 style="margin: 16px 0; color: var(--tennis-green);">Workout Complete!</h2>
        <p style="margin: 12px 0; font-size: 1.1rem; color: var(--text-secondary);">${randomMessage}</p>
        <div style="display: grid; gap: 12px; margin: 24px 0; text-align: left; max-width: 300px; margin-left: auto; margin-right: auto;">
          <div style="padding: 16px; background: var(--surface); border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
            <span style="color: var(--text-secondary);">⏱️ Total Time:</span>
            <strong style="font-size: 1.2rem; color: var(--text-primary);">${minutes}:${String(seconds).padStart(2, '0')}</strong>
          </div>
          <div style="padding: 16px; background: var(--surface); border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
            <span style="color: var(--text-secondary);">✅ Exercises:</span>
            <strong style="font-size: 1.2rem; color: var(--text-primary);">${this.state.exercises.length}</strong>
          </div>
          ${this.state.sections ? `
          <div style="padding: 16px; background: var(--surface); border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
            <span style="color: var(--text-secondary);">📋 Sections:</span>
            <strong style="font-size: 1.2rem; color: var(--text-primary);">${this.state.sections.length}</strong>
          </div>
          ` : ''}
        </div>
        <button onclick="document.getElementById('modal').classList.remove('active'); App.resetWorkoutOnCompletion();"
                class="modal-btn modal-btn-primary"
                style="width: 100%; margin-top: 8px; padding: 14px;">
          Done
        </button>
      </div>
    `;

    this.elements.modal.classList.add('active');
  },

  resetWorkoutOnCompletion() {
    // Reset timer state (already stopped)
    this.state.workoutStartTime = null;
    this.state.workoutPausedAt = null;
    this.updateWorkoutTimer();
    this.updateTimerButton(false);
  },

  handleResetSession() {
    this.showConfirm(
      'Are you sure you want to reset this session? All progress will be lost.',
      () => {
        Storage.resetSession();

        // Re-render exercises
        this.renderExercises();
        this.updateWorkoutProgress();

        this.showToast('Session reset');
      },
      {
        title: 'Reset Session',
        confirmText: 'Reset',
        cancelText: 'Cancel',
        isDanger: true
      }
    );
  },

  // ===================================
  // EXERCISE LIBRARY
  // ===================================

  showExerciseLibrary() {
    this.renderExerciseLibrary();
    this.showView('exerciseLibrary');
    this.updateBreadcrumb('exercises');
  },

  renderExerciseLibrary(filter = 'all', searchTerm = '') {
    const grid = this.elements.exerciseGrid;
    grid.innerHTML = '';

    const exercises = Object.values(EXERCISES);
    let filtered = exercises;

    // Apply category filter
    if (filter !== 'all') {
      filtered = filtered.filter(ex => ex.category === filter);
    }

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(ex =>
        ex.name.toLowerCase().includes(term) ||
        ex.instructions?.some(i => i.toLowerCase().includes(term))
      );
    }

    // Sort alphabetically
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    // Render
    filtered.forEach((exercise, index) => {
      const card = document.createElement('div');
      card.className = 'exercise-card exercise-library-card';
      card.dataset.exerciseId = exercise.id;

      const instructionsHTML = exercise.instructions
        ?.map(i => `<li>${i}</li>`)
        .join('') || '';

      card.innerHTML = `
        <div class="exercise-header">
          <div class="exercise-info">
            <div class="exercise-name">${exercise.name}</div>
            <div class="exercise-details">
              <span>${exercise.category}</span>
            </div>
          </div>
          <a href="${exercise.videoUrl}"
             target="_blank"
             rel="noopener noreferrer"
             class="video-link"
             aria-label="Watch ${exercise.name} video tutorial"
             onclick="event.stopPropagation()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polygon points="10 8 16 12 10 16 10 8" fill="currentColor"/>
            </svg>
          </a>
        </div>
        <div class="exercise-expanded-content">
          ${instructionsHTML ? `
            <div class="exercise-instructions">
              <h4>Instructions:</h4>
              <ul>${instructionsHTML}</ul>
            </div>
          ` : ''}
          ${exercise.tips ? `
            <div class="exercise-tips">
              <h4>Tips:</h4>
              <p>${exercise.tips}</p>
            </div>
          ` : ''}
        </div>
      `;

      // Toggle expand/collapse on card click
      card.addEventListener('click', (e) => {
        // Don't toggle if clicking the video link
        if (e.target.closest('.video-link')) {
          return;
        }

        const isExpanded = card.classList.contains('expanded');

        // Collapse all other cards
        document.querySelectorAll('.exercise-library-card.expanded').forEach(c => {
          if (c !== card) {
            c.classList.remove('expanded');
          }
        });

        // Toggle this card
        card.classList.toggle('expanded');

        // Scroll into view if expanding
        if (!isExpanded) {
          setTimeout(() => {
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 100);
        }
      });

      grid.appendChild(card);
    });

    if (filtered.length === 0) {
      grid.innerHTML = '<div class="empty-state"><p>No exercises found</p></div>';
    }
  },

  showExerciseDetail(exercise) {
    const instructionsHTML = exercise.instructions
      ?.map(i => `<li>${i}</li>`)
      .join('') || '';

    this.elements.modalBody.innerHTML = `
      <h2>${exercise.name}</h2>
      <span class="category-label">${exercise.category}</span>
      <h3>Instructions:</h3>
      <ul>${instructionsHTML}</ul>
      ${exercise.tips ? `
        <h3>Tips:</h3>
        <p>${exercise.tips}</p>
      ` : ''}
      <div style="margin-top: 20px;">
        <a href="${exercise.videoUrl}" target="_blank" rel="noopener noreferrer" class="primary-btn" style="display: inline-flex; align-items: center; gap: 8px; text-decoration: none; color: white;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polygon points="10 8 16 12 10 16 10 8" fill="currentColor"/>
          </svg>
          Watch Video
        </a>
      </div>
    `;

    this.elements.modal.classList.add('active');
  },

  handleExerciseSearch(term) {
    const activeChip = document.querySelector('.filter-chips .chip.active');
    const filter = activeChip?.dataset.category || 'all';
    this.renderExerciseLibrary(filter, term);
  },

  handleFilterChange(chip) {
    // Update active state
    document.querySelectorAll('.filter-chips .chip').forEach(c => {
      c.classList.remove('active');
    });
    chip.classList.add('active');

    // Filter
    const category = chip.dataset.category;
    const searchTerm = this.elements.exerciseSearch.value;
    this.renderExerciseLibrary(category, searchTerm);
  },

  // ===================================
  // CUSTOM WORKOUT
  // ===================================

  showCustomWorkout() {
    this.state.customExercises = Storage.getCustomWorkout() || [];
    this.renderCustomWorkout();
    this.showView('customWorkout');
    this.updateBreadcrumb('custom');
  },

  renderCustomWorkout() {
    const list = document.getElementById('customExerciseList');
    if (!list) return;

    list.innerHTML = '';

    if (this.state.customExercises.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <p>No exercises added yet</p>
          <p class="hint">Tap "Add Exercise" to get started</p>
        </div>
      `;
      return;
    }

    this.state.customExercises.forEach((exerciseId, index) => {
      const exercise = EXERCISES[exerciseId];
      if (!exercise) return;

      const card = document.createElement('div');
      card.className = 'exercise-card custom-exercise-card';

      card.innerHTML = `
        <div class="exercise-header">
          <h3>${exercise.name}</h3>
          <div class="custom-exercise-actions">
            <button class="icon-btn-small remove-btn" data-index="${index}" title="Remove">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="exercise-category">${exercise.category}</div>
        ${exercise.videoUrl ? `
          <a href="${exercise.videoUrl}" target="_blank" rel="noopener noreferrer" class="video-link-text" style="display: inline-flex; align-items: center; gap: 6px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polygon points="10 8 16 12 10 16 10 8" fill="currentColor"/>
            </svg>
            Watch Video
          </a>
        ` : ''}
      `;

      // Add remove handler
      const removeBtn = card.querySelector('.remove-btn');
      removeBtn.addEventListener('click', () => this.removeCustomExercise(index));

      list.appendChild(card);
    });

    // Add action buttons at the bottom
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'custom-workout-actions';
    actionsDiv.innerHTML = `
      <button class="primary-btn" id="startCustomWorkout">Start Workout</button>
      <button class="secondary-btn" id="clearCustomWorkout">Clear All</button>
    `;
    list.appendChild(actionsDiv);

    // Add event listeners
    const startBtn = actionsDiv.querySelector('#startCustomWorkout');
    const clearBtn = actionsDiv.querySelector('#clearCustomWorkout');

    startBtn.addEventListener('click', () => this.startCustomWorkout());
    clearBtn.addEventListener('click', () => this.clearCustomWorkout());
  },

  showExercisePicker() {
    const modalBody = this.elements.modalBody;
    modalBody.innerHTML = `
      <h2>Select Exercise</h2>
      <input type="search" id="modalExerciseSearch" placeholder="Search exercises..." class="search-input">
      <div class="filter-chips">
        <button class="chip active" data-category="all">All</button>
        <button class="chip" data-category="warmup">Warm-up</button>
        <button class="chip" data-category="core">Core</button>
        <button class="chip" data-category="lower">Lower Body</button>
        <button class="chip" data-category="upper">Upper Body</button>
        <button class="chip" data-category="plyo">Plyometrics</button>
        <button class="chip" data-category="agility">Agility</button>
      </div>
      <div id="modalExerciseList" class="modal-exercise-list"></div>
    `;

    // Setup filter chips
    modalBody.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        modalBody.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.renderModalExerciseList(chip.dataset.category, '');
      });
    });

    // Setup search
    const searchInput = modalBody.querySelector('#modalExerciseSearch');
    searchInput.addEventListener('input', (e) => {
      const category = modalBody.querySelector('.chip.active').dataset.category;
      this.renderModalExerciseList(category, e.target.value);
    });

    // Render initial list
    this.renderModalExerciseList('all', '');

    // Show modal
    this.elements.modal.classList.add('active');
  },

  renderModalExerciseList(category, searchTerm) {
    const list = document.getElementById('modalExerciseList');
    if (!list) return;

    list.innerHTML = '';

    const exercises = Object.values(EXERCISES).filter(ex => {
      const matchesCategory = category === 'all' || ex.category === category;
      const matchesSearch = !searchTerm ||
        ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ex.instructions && ex.instructions.join(' ').toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCategory && matchesSearch;
    });

    exercises.forEach(exercise => {
      const card = document.createElement('div');
      card.className = 'modal-exercise-card';
      card.innerHTML = `
        <div class="exercise-name">${exercise.name}</div>
        <div class="exercise-category">${exercise.category}</div>
      `;

      card.addEventListener('click', () => {
        this.addCustomExercise(exercise.id);
        this.closeModal();
      });

      list.appendChild(card);
    });
  },

  addCustomExercise(exerciseId) {
    if (!this.state.customExercises) {
      this.state.customExercises = [];
    }
    this.state.customExercises.push(exerciseId);
    Storage.saveCustomWorkout(this.state.customExercises);
    this.renderCustomWorkout();
    this.showToast('Exercise added!');
  },

  removeCustomExercise(index) {
    this.state.customExercises.splice(index, 1);
    Storage.saveCustomWorkout(this.state.customExercises);
    this.renderCustomWorkout();
    this.showToast('Exercise removed');
  },

  clearCustomWorkout() {
    this.showConfirm(
      'Clear all exercises from this custom workout?',
      () => {
        this.state.customExercises = [];
        Storage.saveCustomWorkout([]);
        this.renderCustomWorkout();
        this.showToast('Workout cleared');
      },
      {
        title: 'Clear Workout',
        confirmText: 'Clear All',
        cancelText: 'Cancel',
        isDanger: true
      }
    );
  },

  startCustomWorkout() {
    if (!this.state.customExercises || this.state.customExercises.length === 0) {
      this.showToast('Add exercises first!');
      return;
    }

    // Convert custom exercise list to workout format
    const customWorkout = {
      id: 'custom',
      name: 'Custom Workout',
      totalTime: this.state.customExercises.length * 2, // Estimate
      exercises: this.state.customExercises.map(id => ({
        exercise: id,
        name: EXERCISES[id].name
      }))
    };

    // Start session immediately to track progress
    Storage.startSession('custom', null, null);

    this.state.exercises = customWorkout.exercises;
    this.state.sections = null;

    this.elements.workoutTitle.textContent = 'Custom Workout';
    this.elements.workoutDuration.textContent = `${customWorkout.totalTime} min (estimated)`;
    this.updateWorkoutProgress();
    this.renderExercises();

    this.showView('workout');
    this.updateBreadcrumb('custom');
  },

  // ===================================
  // UTILITIES
  // ===================================

  loadSession() {
    const session = Storage.getCurrentSession();

    if (session) {
      // Could automatically resume here if desired
    }
  },

  showToast(message, duration = 2000) {
    const toast = this.elements.toast;
    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  },

  closeModal() {
    this.elements.modal.classList.remove('active');
  },

  // Custom confirm dialog
  showConfirm(message, onConfirm, options = {}) {
    const {
      title = 'Confirm',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      isDanger = false
    } = options;

    const modal = this.elements.modal;
    const modalBody = this.elements.modalBody;

    modalBody.innerHTML = `
      <h2>${title}</h2>
      <p class="modal-confirm-message">${message}</p>
      <div class="modal-buttons">
        <button class="modal-btn modal-btn-secondary" id="confirmCancel">${cancelText}</button>
        <button class="modal-btn ${isDanger ? 'modal-btn-danger' : 'modal-btn-primary'}" id="confirmOk">${confirmText}</button>
      </div>
    `;

    modal.classList.add('active');

    // Handle confirm
    document.getElementById('confirmOk').addEventListener('click', () => {
      modal.classList.remove('active');
      if (onConfirm) onConfirm();
    });

    // Handle cancel
    document.getElementById('confirmCancel').addEventListener('click', () => {
      modal.classList.remove('active');
    });

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  },

  // ===================================
  // CELEBRATION ANIMATIONS
  // ===================================

  celebrate() {
    const celebrations = [
      'confetti',
      'tennisBall',
      'fireworks',
      'starBurst'
    ];

    const celebration = celebrations[Math.floor(Math.random() * celebrations.length)];

    switch(celebration) {
      case 'confetti':
        this.showConfetti();
        break;
      case 'tennisBall':
        this.showTennisBall();
        break;
      case 'fireworks':
        this.showFireworks();
        break;
      case 'starBurst':
        this.showStarBurst();
        break;
    }
  },

  showConfetti() {
    const container = document.getElementById('confettiContainer');
    const colors = ['green', 'yellow', 'orange', 'lime'];

    for (let i = 0; i < 30; i++) {
      setTimeout(() => {
        const confetti = document.createElement('div');
        confetti.className = `confetti ${colors[Math.floor(Math.random() * colors.length)]}`;
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.animationDuration = (2 + Math.random()) + 's';
        container.appendChild(confetti);

        setTimeout(() => confetti.remove(), 3000);
      }, i * 50);
    }
  },

  showTennisBall() {
    const container = document.getElementById('confettiContainer');
    const ball = document.createElement('div');
    ball.className = 'tennis-ball-celebration';
    ball.textContent = '🎾';
    ball.style.top = '30%';
    container.appendChild(ball);

    setTimeout(() => ball.remove(), 2000);
  },

  showFireworks() {
    const container = document.getElementById('confettiContainer');
    const colors = ['#2E7D32', '#FFC107', '#FF6F00', '#C5E1A5'];
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 3;

    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.className = 'firework-particle';
      particle.style.left = centerX + 'px';
      particle.style.top = centerY + 'px';
      particle.style.background = colors[Math.floor(Math.random() * colors.length)];

      const angle = (i / 20) * Math.PI * 2;
      const distance = 100 + Math.random() * 50;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;

      particle.style.setProperty('--tx', tx + 'px');
      particle.style.setProperty('--ty', ty + 'px');

      container.appendChild(particle);
      setTimeout(() => particle.remove(), 1000);
    }
  },

  showStarBurst() {
    const container = document.getElementById('confettiContainer');
    const star = document.createElement('div');
    star.className = 'star-burst';
    star.textContent = '⭐';
    container.appendChild(star);

    setTimeout(() => star.remove(), 1500);
  },

  // ===================================
  // WORKOUT TIMER
  // ===================================

  toggleWorkoutTimer() {
    if (this.state.workoutTimerInterval) {
      // Pause
      this.pauseWorkoutTimer();
    } else {
      // Play
      this.startWorkoutTimer();
    }
  },

  startWorkoutTimer() {
    // Start session on first play if not started yet
    if (this.state.pendingSession && !Storage.getCurrentSession()) {
      Storage.startSession(
        this.state.pendingSession.plan,
        this.state.pendingSession.week,
        this.state.pendingSession.day
      );
      this.state.pendingSession = null;
    }

    if (!this.state.workoutStartTime) {
      // First time starting
      this.state.workoutStartTime = Date.now();
    } else if (this.state.workoutPausedAt) {
      // Resuming from pause
      const pausedDuration = Date.now() - this.state.workoutPausedAt;
      this.state.workoutStartTime += pausedDuration;
      this.state.workoutPausedAt = null;
    }

    this.state.workoutTimerInterval = setInterval(() => {
      this.updateWorkoutTimer();
    }, 1000);

    this.updateTimerButton(true);
    this.updateWorkoutTimer();
  },

  pauseWorkoutTimer() {
    if (this.state.workoutTimerInterval) {
      clearInterval(this.state.workoutTimerInterval);
      this.state.workoutTimerInterval = null;
      this.state.workoutPausedAt = Date.now();
    }
    this.updateTimerButton(false);
  },

  resetWorkoutTimer() {
    // Show custom confirmation dialog
    this.showConfirm(
      'All progress will be cleared and cannot be recovered.',
      () => {
        // Stop timer
        this.stopWorkoutTimer();
        this.state.workoutStartTime = null;
        this.state.workoutPausedAt = null;
        this.updateWorkoutTimer();
        this.updateTimerButton(false);

        // Reset session (clears all exercise completions)
        Storage.resetSession();

        // Re-render to update UI (this will show all exercises as unchecked)
        this.renderExercises();
        this.updateWorkoutProgress();
        this.updateSectionProgress();

        this.showToast('Workout reset', 'info');
      },
      {
        title: 'Reset Workout?',
        confirmText: 'Reset',
        cancelText: 'Cancel',
        isDanger: true
      }
    );
  },

  stopWorkoutTimer() {
    if (this.state.workoutTimerInterval) {
      clearInterval(this.state.workoutTimerInterval);
      this.state.workoutTimerInterval = null;
    }
    return this.getWorkoutDuration();
  },

  updateWorkoutTimer() {
    const timerEl = this.elements.workoutTimer;
    if (!timerEl) return;

    const duration = this.getWorkoutDuration();
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  },

  updateTimerButton(isPlaying) {
    const btn = this.elements.playPauseBtn;
    if (!btn) return;

    if (isPlaying) {
      btn.classList.add('playing');
      btn.title = 'Pause';
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
        </svg>
      `;
    } else {
      btn.classList.remove('playing');
      btn.title = 'Play';
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      `;
    }
  },

  getWorkoutDuration() {
    if (!this.state.workoutStartTime) return 0;
    const endTime = this.state.workoutPausedAt || Date.now();
    return Math.floor((endTime - this.state.workoutStartTime) / 1000);
  },

  // ===================================
  // SECTION PROGRESS
  // ===================================

  updateSectionProgress() {
    // Update each section's progress
    document.querySelectorAll('.section-header-card').forEach((header, sectionIndex) => {
      const progressEl = header.querySelector('.section-progress');
      if (!progressEl) return;

      // Get section exercises by data attribute
      const sectionExercises = header.getAttribute('data-exercises');
      if (!sectionExercises) return;

      const exerciseIndices = sectionExercises.split(',').map(Number);
      const completed = exerciseIndices.filter(i => Storage.isExerciseCompleted(i)).length;
      const total = exerciseIndices.length;

      progressEl.textContent = `${completed}/${total}`;

      if (completed === total && total > 0) {
        progressEl.classList.add('complete');
      } else {
        progressEl.classList.remove('complete');
      }
    });
  },

  // ===================================
  // THEME MANAGEMENT
  // ===================================

  initTheme() {
    const themes = ['australian-open', 'french-open', 'wimbledon', 'us-open'];

    // Check if theme is saved
    let savedTheme = localStorage.getItem('tennis-theme');

    // If no saved theme, pick random
    if (!savedTheme) {
      savedTheme = themes[Math.floor(Math.random() * themes.length)];
      localStorage.setItem('tennis-theme', savedTheme);
    }

    this.setTheme(savedTheme);
  },

  setTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem('tennis-theme', themeName);

    // Show toast with theme name
    const themeNames = {
      'australian-open': '🇦🇺 Australian Open',
      'french-open': '🇫🇷 French Open',
      'wimbledon': '🇬🇧 Wimbledon',
      'us-open': '🇺🇸 US Open'
    };

    this.showToast(themeNames[themeName] || themeName);
  },

  cycleTheme() {
    const themes = ['australian-open', 'french-open', 'wimbledon', 'us-open'];
    const currentTheme = document.body.getAttribute('data-theme') || 'wimbledon';
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;

    this.setTheme(themes[nextIndex]);
  },

  showThemeInfo() {
    const modal = this.elements.modal;
    const modalBody = this.elements.modalBody;

    modalBody.innerHTML = `
      <h2>🎾 Grand Slam Themes</h2>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #0099CC;">🇦🇺 Australian Open</h3>
        <p><strong>Primary color:</strong> Blue (specifically, "Australian Open True Blue" for the courts), symbolizing the open summer skies and modernity.</p>
        <p><strong>Secondary color:</strong> White, used for court lines and as a neutral backdrop in branding.</p>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #C1440E;">🇫🇷 Roland-Garros (French Open)</h3>
        <p><strong>Primary color:</strong> Red/Orange Clay (crushed brick red, evoking the surface it is played on).</p>
        <p><strong>Secondary color:</strong> Dark Green (symbolizing the trees and lawns surrounding the courts in Paris).</p>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #2E7D32;">🇬🇧 Wimbledon</h3>
        <p><strong>Primary color:</strong> Dark Green (associated with the natural grass courts, tradition, and prestige).</p>
        <p><strong>Secondary color:</strong> Purple (historically linked to royalty and luxury, trademarked alongside green).</p>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #1565C0;">🇺🇸 US Open</h3>
        <p><strong>Primary color:</strong> Blue (specifically, "US Open Blue" for the inner court, chosen for better ball visibility).</p>
        <p><strong>Secondary color:</strong> Green (used for the outer court area, a nod to the tournament's history of all-green courts before 2005).</p>
      </div>

      <div style="margin-top: 24px; padding: 16px; background: rgba(46, 125, 50, 0.1); border-radius: 8px; border-left: 4px solid var(--primary-color);">
        <p style="margin: 0; font-size: 0.9rem; color: var(--text-secondary);">
          Click the theme button in the header to cycle through all Grand Slam themes!
        </p>
      </div>
    `;

    modal.classList.add('active');
  },

  // ===================================
  // SETTINGS MODAL
  // ===================================

  openSettings() {
    const modal = this.elements.settingsModal;
    if (!modal) return;

    // Duration preference is already set via the shared globalDurationPreference element

    // Set active theme button
    const currentTheme = document.body.getAttribute('data-theme') || 'wimbledon';

    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === currentTheme);
    });

    modal.classList.add('active');
  },

  closeSettings() {
    const modal = this.elements.settingsModal;
    if (modal) {
      modal.classList.remove('active');
    }
  },

  handleSettingsDurationChange(useMax) {
    // Update the global duration toggle if it exists
    const globalToggle = document.getElementById('globalDurationPreference');
    if (globalToggle) {
      globalToggle.checked = useMax;

      // Trigger the global duration change handler
      this.handleGlobalDurationChange();
    }
  },

  // ===================================
  // VOICE-GUIDED WORKOUT
  // ===================================

  showVoiceGuidedButton(planType) {
    const voiceBtn = document.getElementById('voiceGuidedBtn');
    if (!voiceBtn) return;

    // Show button only for supported plans
    const supportedPlans = ['warmup', 'cooldown', '8-week'];
    if (supportedPlans.includes(planType)) {
      voiceBtn.style.display = 'flex';
    } else {
      voiceBtn.style.display = 'none';
    }
  }
};

// Export App for external initialization
window.TennisApp = App;

// Note: App is initialized from index.html after validation checks
