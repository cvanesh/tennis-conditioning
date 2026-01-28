# Tennis Conditioning Pro - Project Context

**Last Updated:** 2026-01-27
**Purpose:** Quick reference for understanding the project, common issues, and established patterns

---

## 1. PROJECT OVERVIEW

### What It Is
A Progressive Web App (PWA) for tennis players to follow structured conditioning workouts with voice guidance, timers, and progress tracking.

### Key Features
- **8-Week Training Program** - Structured workout plans with progressive difficulty
- **Voice-Guided Workouts** - Hands-free workout experience with voice announcements and audio cues
- **Warm-Up/Cool-Down Protocols** - Pre-made protocols for match preparation
- **Custom Workouts** - Build custom workout plans from exercise library
- **Nutrition Guidance** - Pre/during/post-match nutrition information
- **Progress Tracking** - localStorage-based tracking with encryption support
- **Offline Support** - Full PWA with service worker for offline use

### Target Platform
- **Primary:** iOS Safari (iPad/iPhone)
- **Secondary:** Desktop browsers (Chrome, Safari, Firefox)
- **Critical:** Must work on mobile Safari (unique challenges)

---

## 2. ARCHITECTURE & KEY FILES

### File Structure
```
tennis-conditioning/
├── index.html              # Main HTML structure
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
├── css/
│   └── styles.css         # All styles (2700+ lines)
├── js/
│   ├── app.js             # Main app controller (2400+ lines)
│   ├── voice-workout-controller.js  # Voice workout orchestration (1100+ lines)
│   ├── voice-workout.js   # Voice/audio managers (470+ lines)
│   ├── timer.js           # Timer display/controls (360+ lines)
│   ├── storage.js         # localStorage wrapper (120+ lines)
│   ├── auth.js            # Password encryption (210+ lines)
│   ├── features.js        # Feature detection (65+ lines)
│   ├── data-encrypted.js  # Encrypted workout data
│   └── data.js            # Unencrypted data (gitignored, dev only)
└── validate-code.js       # Automated code validator (gitignored)
```

### Key Classes & Their Responsibilities

#### `VoiceWorkoutController` (voice-workout-controller.js)
- **Purpose:** Orchestrates voice-guided workout flow
- **State Management:** `this.state` (can be null when workout stopped)
- **Key Methods:**
  - `startWorkout()` - Initializes new workout
  - `startExerciseFlow()` - Async flow for each exercise
  - `pause()`/`resume()` - Playback controls
  - `navigateSection()`/`navigateExercise()` - Navigation
  - `updateUI()` - Updates all UI elements
- **Critical:** All methods must check `if (!this.state) return`

#### `VoiceGuideManager` (voice-workout.js)
- **Purpose:** Text-to-speech announcements
- **Voice:** Prefers "Rishi" voice at 0.9 rate
- **Error Handling:** Never rejects promises (resolves on error)
- **Key Methods:**
  - `speak()` - Returns promise, always resolves
  - `cancel()` - Stops current speech
  - `announceExercise()`, `announceSection()`, etc.

#### `AudioManager` (voice-workout.js)
- **Purpose:** Programmatic beeps using Web Audio API
- **Key Methods:**
  - `playCountdownBeeps()` - Countdown beeps
  - `playSuccess()` - Completion sound
  - `ensureAudioContext()` - Handles audio context state

#### `WakeLockManager` (voice-workout.js)
- **Purpose:** Prevent screen sleep during workout
- **Default:** Disabled (user must opt-in via toggle)
- **Platform:** May not work on all iOS versions

#### `App` (app.js)
- **Purpose:** Main application controller
- **State Management:** `this.state` object with current view, plan, exercises
- **View Management:** `showView()` - Switches between home/workout/library
- **Workout Loading:** `loadWorkout()` - Sets up exercise list

---

## 3. COMMON BUG PATTERNS

### 🔴 Pattern 1: Null State Access After Async Operations

**Problem:**
```javascript
async startExerciseFlow() {
  await this.announceExercise(exercise);
  // User clicked X during announcement
  this.state.timerState.type = 'exercise'; // ❌ CRASH: state is null
}
```

**Why It Happens:**
- User stops workout during async voice announcement
- `closeWorkout()` sets `this.state = null`
- Async function continues executing after await
- Tries to access `this.state.something` → TypeError

**Solution:**
```javascript
async startExerciseFlow() {
  await this.announceExercise(exercise);
  if (!this.state) return; // ✅ Check after every await
  this.state.timerState.type = 'exercise';
}
```

**Files Affected:** voice-workout-controller.js (all async methods)

---

### 🟡 Pattern 2: Method Name Typos

**Problem:**
```javascript
confirmStopWorkout() {
  if (this.isRunning) {
    this.pauseWorkout(); // ❌ TypeError: pauseWorkout is not a function
  }
}
```

**Why It Happens:**
- Method is actually named `pause()`, not `pauseWorkout()`
- JavaScript doesn't catch these until runtime
- No TypeScript or JSDoc to help

**Solution:**
- Run `node -c file.js` to check syntax
- Use automated validation: `node validate-code.js`
- Test thoroughly before committing

**Fixed:** voice-workout-controller.js:760 (changed to `this.pause()`)

---

### 🟡 Pattern 3: Speech Synthesis Errors on iOS

**Problem:**
```javascript
utterance.onerror = (event) => {
  console.error('Speech synthesis error:', event);
  reject(event); // ❌ Unhandled promise rejection
};
```

**Why It Happens:**
- iOS Safari has strict audio policies
- Speech synthesis can fail silently
- Errors are treated as critical but shouldn't be

**Solution:**
```javascript
utterance.onerror = (event) => {
  console.warn('Speech synthesis error (non-critical):', event.error);
  resolve(); // ✅ Continue workout, don't crash
};
```

**Fixed:** voice-workout.js:83-88

---

### 🟡 Pattern 4: Intervals Not Cleared

**Problem:**
```javascript
startCountdown() {
  setInterval(() => {
    this.state.timerState.elapsed++; // ❌ Continues after state is null
  }, 1000);
}
```

**Why It Happens:**
- Interval keeps running after workout stopped
- Tries to access null state
- No cleanup on stop

**Solution:**
```javascript
startCountdown() {
  this.countdownInterval = setInterval(() => {
    if (!this.state) { // ✅ Check state exists
      clearInterval(this.countdownInterval);
      return;
    }
    this.state.timerState.elapsed++;
  }, 1000);
}

stopTimer() {
  if (this.countdownInterval) {
    clearInterval(this.countdownInterval); // ✅ Clean up
    this.countdownInterval = null;
  }
}
```

**Fixed:** voice-workout-controller.js:248-266, 559-562

---

### 🟡 Pattern 5: Voice Continues After Pause/Stop

**Problem:**
```javascript
async pause() {
  this.isRunning = false;
  await this.voiceGuide.announcePause(); // Voice still speaking from before
}
```

**Why It Happens:**
- Previous voice announcement still playing
- New pause announcement starts while old one is active
- Confusing for user

**Solution:**
```javascript
async pause() {
  this.isRunning = false;
  this.voiceGuide.cancel(); // ✅ Stop current speech first
  await this.voiceGuide.announcePause();
}
```

**Fixed:** voice-workout-controller.js:470

---

### 🟠 Pattern 6: Timer Button CSS Issues

**Problem:**
- Pause button showing mustard yellow (#FFC107) with grey text
- Looked out of place, poor contrast
- Used `var(--tennis-yellow)` which was accent color

**Solution:**
```css
.timer-btn.pause {
  background: var(--warning); /* #FF9800 orange */
  color: white; /* Better contrast */
}
```

**Fixed:** styles.css:1298-1306

---

### 🔵 Pattern 7: Timeline UI - Line Extending Beyond Circles

**Problem:**
- Progress line extended full width (left: 0, right: 0)
- Line visible before first circle and after last circle
- Wanted line to only connect circles

**Solution:**
```css
.timeline-connector {
  left: 12%; /* Start inside first circle */
  right: 12%; /* End inside last circle */
}
```

**Fixed:** styles.css:2522-2523

---

## 4. FIXES APPLIED (Chronological)

### Session 1: Voice Workout Initial Issues
**Date:** 2026-01-27 (early)

1. ✅ **Timeline UI Enhancement**
   - Made line go through circles, not extend beyond
   - Changed margins from 0% to 12%

2. ✅ **Speech Synthesis Error Handling**
   - Changed promises to always resolve (never reject)
   - Errors logged as warnings, not errors
   - Workout continues even if voice fails

3. ✅ **Pause Button Typo**
   - Fixed `this.pauseWorkout()` → `this.pause()`
   - Method name was incorrect

4. ✅ **Timer Button Styling**
   - Changed pause button from mustard yellow to orange
   - Improved contrast (grey text → white text)
   - Added specific hover states for each button

### Session 2: Null State Errors
**Date:** 2026-01-27 (late)

5. ✅ **Comprehensive Null Safety**
   - Added null checks in 10 critical functions
   - Fixed: `pause()`, `resume()`, `updateTotalTime()`, `showCompletionSummary()`
   - Fixed: `updateNavigationButtons()`, `repeatInstructions()`, `isFirstExerciseInSection()`
   - Fixed: `navigateSection()`, `navigateExercise()`, `setupDurationRangeToggle()`

6. ✅ **Voice Cancellation on Pause**
   - Added `this.voiceGuide.cancel()` to `pause()` method
   - Stops ongoing announcements when user pauses

### Session 3: iOS Safari Issues
**Date:** 2026-01-27 (previous)

7. ✅ **"Resuming" Issue on iOS**
   - Fixed by clearing session when starting NEW workout
   - Resume prompt only shows on page load, not on start

8. ✅ **Wake Lock API Toggle**
   - Added optional "Keep Screen Awake" toggle
   - Disabled by default (iOS compatibility)
   - User can enable in config modal

9. ✅ **Debug Console (eruda)**
   - Added mobile debug console for iPad
   - Enabled with `?debug=true` URL parameter
   - Shows console logs, errors, network, DOM inspector

---

## 5. CODING PATTERNS & BEST PRACTICES

### ✅ Pattern: Null Checks in Async Functions

**ALWAYS check state after await:**
```javascript
async myFunction() {
  if (!this.state) return; // Check at start

  await someAsyncOperation();
  if (!this.state) return; // Check after await

  this.state.something = value; // Now safe to access
}
```

### ✅ Pattern: Interval Management

**Store interval references and clean up:**
```javascript
class Controller {
  startTimer() {
    this.timerInterval = setInterval(() => {
      if (!this.state) {
        clearInterval(this.timerInterval); // Clean up if state gone
        return;
      }
      // Timer logic
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
```

### ✅ Pattern: Defensive DOM Access

**Check elements exist before using:**
```javascript
updateUI() {
  if (!this.state) return;

  if (this.elements.title) {
    this.elements.title.textContent = this.state.name;
  }
}
```

### ✅ Pattern: Error Handling in Promises

**Always resolve, never reject for non-critical errors:**
```javascript
speak(text) {
  return new Promise((resolve) => { // Note: no reject parameter
    utterance.onerror = (event) => {
      console.warn('Non-critical error:', event);
      resolve(); // Continue execution
    };

    utterance.onend = () => {
      resolve();
    };
  });
}
```

### ✅ Pattern: Early Returns

**Exit early when preconditions not met:**
```javascript
function processData() {
  if (!this.state) return;
  if (!this.state.data) return;
  if (this.state.data.length === 0) return;

  // Now safe to process
  this.state.data.forEach(item => {
    // Process
  });
}
```

### ❌ Anti-Pattern: Assuming State Exists

**DON'T:**
```javascript
updateTimer() {
  const elapsed = this.state.timerState.elapsed; // ❌ Can crash
}
```

**DO:**
```javascript
updateTimer() {
  if (!this.state || !this.state.timerState) return;
  const elapsed = this.state.timerState.elapsed; // ✅ Safe
}
```

### ❌ Anti-Pattern: Ignoring Async Timing

**DON'T:**
```javascript
async myFunction() {
  await longOperation();
  // Assume state still valid here ❌
  this.state.value = 123;
}
```

**DO:**
```javascript
async myFunction() {
  await longOperation();
  if (!this.state) return; // ✅ Check again
  this.state.value = 123;
}
```

---

## 6. TOOLS AVAILABLE

### validate-code.js

**Purpose:** Automated static analysis to catch common bugs

**Usage:**
```bash
node validate-code.js
```

**What It Checks:**
- ✅ Null references without nearby checks
- ✅ Array access without bounds checking
- ✅ Async functions without error handling
- ✅ setInterval without clearInterval
- ✅ DOM element access without null checks

**When to Run:**
- Before committing code
- After adding new features
- When debugging mysterious errors
- During code reviews

**Output:**
- Groups issues by severity (CRITICAL/HIGH/MEDIUM/LOW)
- Shows file, line number, issue type, code snippet
- Exits with error code if critical/high issues found

**Note:** Many MEDIUM/LOW issues are false positives. Use judgment.

---

### Debug Console (eruda)

**Purpose:** Mobile debugging for iOS Safari

**Usage:**
Add `?debug=true` to URL:
```
https://cvanesh.github.io/tennis-conditioning/?debug=true
```

**Features:**
- Console logs and errors
- Network requests
- DOM inspector
- localStorage viewer
- Performance metrics

**How to Enable:**
Controlled by URL parameter in index.html:
```javascript
if (urlParams.get('debug') === 'true') {
  // Load eruda from CDN
}
```

**When to Use:**
- Debugging on iPad/iPhone
- Inspecting console errors
- Checking network requests
- Viewing localStorage data

---

## 7. TESTING STRATEGIES

### Manual Testing Checklist

**Voice Workout Flow:**
1. ✅ Start workout → Should begin countdown immediately
2. ✅ Click X during countdown → Should pause and show confirmation
3. ✅ Click X during exercise → Should pause and show confirmation
4. ✅ Click X during voice announcement → Should cancel voice and show confirmation
5. ✅ Pause during exercise → Should pause timer and cancel voice
6. ✅ Resume → Should continue from where paused
7. ✅ Navigate to next exercise → Should work without errors
8. ✅ Navigate to previous section → Should work without errors
9. ✅ Complete workout → Should show completion summary
10. ✅ Refresh during workout → Should offer to resume

**iOS Safari Specific:**
1. ✅ Test with Wake Lock disabled (default)
2. ✅ Test with Wake Lock enabled
3. ✅ Test voice announcements (may fail silently)
4. ✅ Test with ?debug=true to see console errors
5. ✅ Test page visibility changes (home button)
6. ✅ Test with low battery mode (affects audio)

**Timer Features:**
1. ✅ Duration range slider (20-30s exercises)
2. ✅ Timer play/pause buttons
3. ✅ Timer display updates correctly
4. ✅ Progress ring animates
5. ✅ Rest periods work correctly

**Edge Cases:**
1. ✅ Stop workout during countdown
2. ✅ Stop workout during exercise
3. ✅ Stop workout during rest period
4. ✅ Navigate away during voice announcement
5. ✅ Close browser tab during workout
6. ✅ Reload page during workout

---

## 8. DEPLOYMENT PROCESS

### GitHub Pages Deployment

**Repository:** https://github.com/cvanesh/tennis-conditioning
**Live URL:** https://cvanesh.github.io/tennis-conditioning/

**Deploy Command:**
```bash
git push origin main
```

**GitHub Pages automatically deploys from main branch**

### Pre-Deployment Checklist

1. ✅ Run validation: `node validate-code.js`
2. ✅ Test locally on desktop browser
3. ✅ Test on iOS Safari (iPad/iPhone)
4. ✅ Check console for errors with ?debug=true
5. ✅ Verify no sensitive data (use data-encrypted.js)
6. ✅ Check .gitignore excludes dev tools
7. ✅ Create descriptive commit message

### Post-Deployment

1. ✅ Test live URL immediately
2. ✅ Check with ?debug=true for errors
3. ✅ Test on target devices (iOS)
4. ✅ Verify service worker updates correctly
5. ✅ Clear cache if needed (Cmd+Shift+R)

---

## 9. KNOWN ISSUES & LIMITATIONS

### iOS Safari Limitations

1. **Speech Synthesis Unreliable**
   - May fail silently
   - Voice may sound robotic
   - Rate/pitch may not work as expected
   - **Solution:** Error handling resolves instead of rejecting

2. **Wake Lock API Limited Support**
   - May not work on older iOS versions
   - May not work in low power mode
   - **Solution:** Made optional, disabled by default

3. **Audio Context Restrictions**
   - Requires user interaction to start
   - May suspend in background
   - **Solution:** ensureAudioContext() before playing

4. **Service Worker Issues**
   - May not update immediately
   - May cache aggressively
   - **Solution:** Hard refresh (Cmd+Shift+R) when needed

### General Limitations

1. **No Backend**
   - All data client-side
   - No sync across devices
   - No backup/restore
   - **Mitigation:** localStorage with optional encryption

2. **No Real-Time Validation**
   - JavaScript not type-checked
   - Errors only found at runtime
   - **Mitigation:** validate-code.js for static analysis

3. **Large Single Files**
   - app.js is 2400+ lines
   - voice-workout-controller.js is 1100+ lines
   - Harder to navigate
   - **Trade-off:** Kept as-is for simplicity

---

## 10. DESIGN DECISIONS

### Why Voice Workout Controller Uses `this.state`

**Decision:** Use single state object that can be set to null

**Reasoning:**
- Simple to understand
- Easy to save/restore from localStorage
- Clear lifecycle: null = no workout, object = active workout
- Allows early returns: `if (!this.state) return`

**Trade-off:** Requires null checks everywhere

**Alternative Considered:** Boolean flag + always-present state object
**Why Not:** More complex, still need checks for partial state

---

### Why Speech Synthesis Never Rejects

**Decision:** `speak()` always resolves, never rejects

**Reasoning:**
- Speech failure is not critical to workout
- iOS Safari speech is unreliable
- Better to continue silently than crash
- Workout can proceed without voice

**Trade-off:** User doesn't know if voice failed

**Alternative Considered:** Reject and catch everywhere
**Why Not:** Too many try-catch blocks, complex flow

---

### Why Wake Lock Is Disabled by Default

**Decision:** User must opt-in to Wake Lock

**Reasoning:**
- iOS support is spotty
- Can cause unexpected behavior
- Battery drain concerns
- Not essential for workout

**Trade-off:** Screen may sleep during workout

**Alternative Considered:** Enabled by default
**Why Not:** Would cause issues on iOS for most users

---

### Why validate-code.js Is Not in Production

**Decision:** Keep validation script gitignored

**Reasoning:**
- Development tool only
- Requires Node.js to run
- Not needed for PWA to function
- May confuse users

**Trade-off:** Must remember to run manually

**Alternative Considered:** CI/CD integration
**Why Not:** No CI/CD pipeline for this project

---

### Why Encrypted Data Is Used

**Decision:** Workout data is encrypted in data-encrypted.js

**Reasoning:**
- User requested password protection
- Keeps data semi-private
- Lightweight encryption sufficient
- Can still use unencrypted for dev

**Trade-off:** Must enter password on each session

**Alternative Considered:** No encryption
**Why Not:** User requirement for privacy

---

## 11. FUTURE IMPROVEMENTS (Not Implemented)

### Potential Enhancements

1. **TypeScript Migration**
   - Would catch method name typos
   - Would enforce null checks
   - Would provide better IDE support
   - **Why Not Yet:** Significant refactor required

2. **Automated Testing**
   - Unit tests for critical functions
   - Integration tests for workflows
   - E2E tests with Playwright
   - **Why Not Yet:** Time/complexity vs benefit

3. **State Management Library**
   - Redux/Zustand for predictable state
   - Time-travel debugging
   - Easier testing
   - **Why Not Yet:** Overkill for current scope

4. **Backend Integration**
   - Cloud sync
   - Backup/restore
   - Multi-device support
   - **Why Not Yet:** Complexity, cost, privacy concerns

5. **Web Components**
   - Reusable UI components
   - Better encapsulation
   - Easier testing
   - **Why Not Yet:** Current approach working fine

---

## 12. QUICK REFERENCE

### When You See "TypeError: null is not an object"

1. Check if it's accessing `this.state.something`
2. Add null check: `if (!this.state) return`
3. If after await, add check after the await
4. Run `node validate-code.js` to find similar issues

### When You See "Unhandled Promise Rejection"

1. Check if it's in voice-workout.js
2. Make sure promise always resolves (never rejects)
3. Wrap in try-catch if needed
4. Log warnings instead of errors

### When Timer Doesn't Work on iOS

1. Check debug console with ?debug=true
2. Look for speech synthesis errors (expected, non-critical)
3. Check if state is null
4. Check if intervals are being cleared properly

### When UI Looks Wrong

1. Check CSS for that element
2. Look for color variables (--tennis-yellow, --warning, etc.)
3. Check z-index conflicts (modals)
4. Test on actual device, not just browser

### When Voice Doesn't Work

1. Check if voiceEnabled is true in config
2. Check for speech synthesis errors (console)
3. May be iOS limitation - not fixable
4. Workout should continue without voice

---

## 13. CONTACT & RESOURCES

### Repository
- GitHub: https://github.com/cvanesh/tennis-conditioning
- Live: https://cvanesh.github.io/tennis-conditioning/

### Documentation
- This file: `.claude/project-context.md`
- Code validation: `validate-code.js` (gitignored)
- README: `README.md` (if exists)

### Key Dependencies
- eruda: https://cdn.jsdelivr.net/npm/eruda (debug console)
- Web Speech API: Built-in (voice synthesis)
- Web Audio API: Built-in (beeps)
- Wake Lock API: Built-in (screen wake)
- localStorage: Built-in (data persistence)

---

**END OF CONTEXT FILE**

*This file should be updated whenever:*
- *New bugs are discovered and fixed*
- *New patterns emerge*
- *Architecture changes*
- *New tools are added*
- *Design decisions are made*
