# Tennis Conditioning Pro - Claude Instructions

## Project Overview
PWA for tennis conditioning with encrypted workout data. Target user is an aggressive junior player with a one-handed backhand.

## Key Architecture
- Data is encrypted in `js/data-encrypted.js` (AES-256-GCM, PBKDF2 key derivation)
- Decrypt with `node decrypt-data.js` to get `js/data.js` for editing
- After editing data.js, re-encrypt using `encrypt-data.html` in browser
- Warmup protocol is in `DATA.warmup` with sections containing exercises
- Each exercise references a key in `DATA.exercises` (the exercise library)

## Data Structure Reference
```
warmup: {
  id: 'warmup',
  name: 'Warm-Up Protocol',
  totalTime: <minutes>,
  sections: [{
    name: 'Section Name',
    timeRange: '0-5 min',
    duration: <minutes>,
    note: 'optional',
    exercises: [{
      exercise: 'exercise_key',  // must exist in DATA.exercises
      sets: N,
      reps: N,
      perSide: true/false,
      duration: N,  // seconds
      rest: N       // seconds
    }]
  }]
}
```

## Planned: New Warmup Sections

### Section: Band Dynamic Stretching (Arms & Shoulders) - ~2.5 min
**Purpose:** Activate rotator cuff, scapular stabilizers, and shoulder extensors critical for one-handed backhand power and injury prevention.

Exercises (all with light resistance band):
1. **Band Pull-Aparts** - 15 reps
   - Horizontal abduction, activates rear delts and rhomboids
   - Key for deceleration phase of one-handed backhand follow-through
2. **Band External Rotation (90/90)** - 10 reps per side
   - Elbow at 90 degrees, rotate forearm outward against band
   - Critical rotator cuff activation for backhand prep
3. **Band Overhead Stretch & Pull-Down** - 10 reps
   - Arms overhead with band, pull down to chest level stretching band apart
   - Lat activation + shoulder mobility for trophy position and serve
4. **Band Sword Draws** - 8 reps per side
   - Pull band from opposite hip up and across body (like drawing a sword)
   - Mimics one-handed backhand kinetic chain activation

### Section: Jump Rope Skipping - ~2.5 min
**Purpose:** Elevate heart rate, develop footwork rhythm, ankle stiffness, and split-step reactivity for aggressive court coverage.

Exercises:
1. **Basic Two-Foot Bounce** - 30 seconds
   - Light, quick bounces on balls of feet
   - Establish rhythm and warm up calves/Achilles
2. **Alternating Foot Skip (High Knees)** - 30 seconds
   - Alternate feet with knee drive
   - Mimics explosive first step and recovery footwork
3. **Lateral Shuffle Skip** - 20 seconds
   - Skip rope while shuffling side to side (2 steps each direction)
   - Court-specific lateral movement pattern
4. **Double-Under Attempts or Fast Singles** - 20 seconds
   - Maximum speed/power - explosive calf drive
   - Builds reactive ankle stiffness for split steps
5. **Ali Shuffle (Scissor Steps)** - 20 seconds
   - Alternate feet forward/back while skipping
   - Trains split-step timing and quick directional changes

**Total added time: ~5 minutes** (fits within the "not more than 5 minutes" constraint)
