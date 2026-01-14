# Tennis Conditioning Pro 🎾

A mobile-first progressive web application for tennis conditioning and fitness training. Built specifically for junior players following an 8-week structured conditioning program.

## Features

### 🎯 Training Programs
- **8-Week Conditioning Program** - Complete structured program with 4 training days per week
- **Warm-Up Protocol** - 8-10 minute preparation routine
- **Cool-Down Protocol** - 5-7 minute recovery routine
- **Exercise Library** - 150+ exercises with video demonstrations
- **Custom Workouts** - Create and save personalized training sessions

### 💪 Workout Features
- **Expandable Exercise Cards** - Tap to view detailed instructions, tips, and form cues
- **Video Demonstrations** - Direct links to exercise tutorials
- **Built-in Timers** - For timed exercises and rest periods
- **Progress Tracking** - Check off completed exercises, track session progress
- **Session State** - Resume where you left off across sessions
- **Mobile-Optimized** - Touch-friendly interface designed for use at the gym/court

### 🎨 Design
- Tennis-themed color scheme (green & yellow)
- Clean, sporty interface
- Mobile-first responsive design
- Smooth animations and transitions
- Offline-capable (all data stored locally)

## Technology Stack

- **Pure HTML5** - Semantic markup
- **CSS3** - Modern styling with CSS variables and animations
- **Vanilla JavaScript** - No frameworks, lightweight and fast
- **LocalStorage API** - Client-side data persistence
- **Web Audio API** - Timer completion sounds
- **Vibration API** - Haptic feedback

## File Structure

```
tennis-conditioning/
├── index.html              # Main HTML file
├── css/
│   └── styles.css         # All styling (tennis-themed, mobile-first)
├── js/
│   ├── data.js            # Exercise database and program structure
│   ├── storage.js         # LocalStorage management
│   ├── timer.js           # Timer functionality
│   └── app.js             # Main application logic
├── tennis_conditioning_plan.md              # Original program markdown
├── tennis_conditioning_plan_with_videos.md  # Program with video links
└── README.md              # This file
```

## How to Use

### Running Locally
1. Clone or download this repository
2. Open `index.html` in a modern web browser
3. No build process or server required!

### Deploying to GitHub Pages
1. Push this repository to GitHub
2. Go to Settings → Pages
3. Select main branch as source
4. Access at: `https://cvanesh.github.io/`

### Using the App

#### Getting Started
1. **Choose a Plan** - Select from 8-Week Program, Warm-Up, Cool-Down, or Exercise Library
2. **Navigate** - For 8-Week Program, select week then day
3. **Start Workout** - View exercises, tap to expand for details
4. **Use Timers** - Start timers for timed exercises and rest periods
5. **Track Progress** - Check off completed exercises
6. **Resume Anytime** - Your progress is automatically saved

#### Exercise Cards
- **Tap the card** - Expand to see instructions and tips
- **Tap the checkbox** - Mark exercise as complete
- **Tap 🎥** - Watch video demonstration
- **Use timer buttons** - ▶ Start, ⏸ Pause, ↻ Reset

#### Week/Day Selection
- **Green checkmark** - Completed workout
- **Yellow border** - In-progress workout
- **Gray** - Not started

## Data Storage

All data is stored locally in your browser using LocalStorage:
- Workout progress and completion status
- Current session state (can resume later)
- Custom workouts (when created)
- User settings (sound, vibration preferences)

**Privacy:** No data is sent to any server. Everything stays on your device.

## Browser Compatibility

- ✅ Chrome/Edge (recommended)
- ✅ Safari iOS (mobile)
- ✅ Firefox
- ✅ Samsung Internet

Requires a modern browser with ES6 support.

## Features Coming Soon

- [ ] More weeks of detailed workout data (currently Week 1-2 fully implemented)
- [ ] Custom workout builder with drag-and-drop
- [ ] Export/import workout data
- [ ] Dark mode
- [ ] Print-friendly workout sheets
- [ ] Exercise substitutions

## Program Details

The 8-week program is based on:
- **ITF Conditioning Guidelines**
- **Long-Term Athletic Development (LTAD) Principles**
- **Peer-Reviewed Research**

### Program Structure
- **Phase 1 (Weeks 1-2):** Foundation - Movement quality, technique mastery
- **Phase 2 (Weeks 3-5):** Development - Increased volume, includes deload week
- **Phase 3 (Weeks 6-8):** Intensification - Peak performance and testing

### Training Days
- **Monday:** Speed, Agility & Coordination
- **Tuesday:** Core Strength & Stability
- **Thursday:** Lower Body Power & Plyometrics
- **Friday:** Upper Body Strength & Endurance

## Credits

Program created based on:
- ITF (International Tennis Federation) youth conditioning guidelines
- LTAD framework for junior athletes (ages 12-16)
- Tennis-specific movement patterns and injury prevention research

## License

This project is open source and available for personal use.

## Support

For issues or suggestions, please create an issue on the GitHub repository.

---

**Built with 💚 for junior tennis players**

*Train smart. Play better. 🎾*
