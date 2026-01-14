#!/usr/bin/env node

/**
 * Tennis Conditioning Data Validation Script
 *
 * This script validates that all exercises and workout details from the markdown files
 * are accurately represented in the data.js file.
 *
 * Usage: node validate-data.js
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Helper to colorize output
const colorize = (text, color) => `${colors[color]}${text}${colors.reset}`;

// Read files
const mdFile1 = fs.readFileSync(path.join(__dirname, 'tennis_conditioning_plan.md'), 'utf8');
const mdFile2 = fs.readFileSync(path.join(__dirname, 'tennis_conditioning_plan_with_videos.md'), 'utf8');
const dataJsContent = fs.readFileSync(path.join(__dirname, 'js/data.js'), 'utf8');

// Parse data.js to extract the data structure
let EIGHT_WEEK_PROGRAM = null;
let WARMUP_PROTOCOL = null;
let COOLDOWN_PROTOCOL = null;
let EXERCISE_LIBRARY = null;

try {
  // Use eval in a controlled way to extract the data
  eval(dataJsContent);
} catch (error) {
  console.error(colorize('Error parsing data.js:', 'red'), error.message);
  process.exit(1);
}

// Validation results
const results = {
  total: 0,
  found: 0,
  missing: 0,
  misplaced: 0,
  details: []
};

// Helper function to normalize text for comparison
const normalize = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// Helper to find exercise in data.js
const findExerciseInData = (exerciseName, week, day, sectionName = null) => {
  if (!EIGHT_WEEK_PROGRAM || !EIGHT_WEEK_PROGRAM.program) {
    return { found: false, location: null };
  }

  const weekKey = `week${week}`;
  const weekData = EIGHT_WEEK_PROGRAM.program[weekKey];

  if (!weekData) {
    return { found: false, location: null };
  }

  const dayData = weekData[day.toLowerCase()];
  if (!dayData || !dayData.sections) {
    return { found: false, location: null };
  }

  // Search through all sections
  for (const section of dayData.sections) {
    for (const exercise of section.exercises) {
      if (normalize(exercise.name) === normalize(exerciseName)) {
        const correctSection = sectionName ? normalize(section.name) === normalize(sectionName) : true;
        return {
          found: true,
          location: `Week ${week} > ${day} > ${section.name}`,
          correctSection: correctSection,
          actualSection: section.name,
          expectedSection: sectionName,
          exercise: exercise
        };
      }
    }
  }

  return { found: false, location: null };
};

// Parse markdown to extract workout structure
const parseMarkdown = (mdContent) => {
  const weeks = [];
  const lines = mdContent.split('\n');

  let currentWeek = null;
  let currentDay = null;
  let currentSection = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Match Week header (e.g., "## WEEK 1" or "### Week 1")
    const weekMatch = line.match(/^#{2,4}\s+WEEK\s+(\d+)/i);
    if (weekMatch) {
      currentWeek = {
        number: parseInt(weekMatch[1]),
        days: []
      };
      weeks.push(currentWeek);
      continue;
    }

    // Match Day header (e.g., "### MONDAY - Speed" or "#### Monday")
    const dayMatch = line.match(/^#{3,4}\s+(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)/i);
    if (dayMatch && currentWeek) {
      currentDay = {
        name: dayMatch[1],
        sections: []
      };
      currentWeek.days.push(currentDay);
      continue;
    }

    // Match Section header (e.g., "**Minute 0-5: Acceleration Mechanics**")
    const sectionMatch = line.match(/^\*\*Minute\s+\d+-\d+:\s+(.+?)\*\*/i);
    if (sectionMatch && currentDay) {
      const sectionName = sectionMatch[1].trim();
      currentSection = {
        name: sectionName,
        exercises: []
      };
      currentDay.sections.push(currentSection);
      continue;
    }

    // Match Exercise (e.g., "- **High Knees** - 20 yards")
    const exerciseMatch = line.match(/^\s*-\s+\*\*(.+?)\*\*\s*(?:-\s*(.+))?$/);
    if (exerciseMatch && currentSection) {
      const exerciseName = exerciseMatch[1].trim();
      const details = exerciseMatch[2] ? exerciseMatch[2].trim() : null;

      currentSection.exercises.push({
        name: exerciseName,
        details: details
      });
      continue;
    }

    // Also match numbered exercises (e.g., "1. **Forearm Plank** - 20 seconds")
    const numberedExerciseMatch = line.match(/^\s*\d+\.\s+\*\*(.+?)\*\*\s*(?:-\s*(.+))?$/);
    if (numberedExerciseMatch && currentSection) {
      const exerciseName = numberedExerciseMatch[1].trim();
      const details = numberedExerciseMatch[2] ? numberedExerciseMatch[2].trim() : null;

      currentSection.exercises.push({
        name: exerciseName,
        details: details
      });
    }
  }

  return weeks;
};

// Parse both markdown files
console.log(colorize('\n═══════════════════════════════════════════════════════════', 'cyan'));
console.log(colorize('  Tennis Conditioning Data Validation', 'cyan'));
console.log(colorize('═══════════════════════════════════════════════════════════\n', 'cyan'));

console.log(colorize('📄 Parsing markdown files...', 'blue'));
const mdData1 = parseMarkdown(mdFile1);
const mdData2 = parseMarkdown(mdFile2);

// Use the file with more data (likely the one with videos has more detail)
const mdData = mdData2.length > mdData1.length ? mdData2 : mdData1;
const sourceFile = mdData2.length > mdData1.length ? 'tennis_conditioning_plan_with_videos.md' : 'tennis_conditioning_plan.md';

console.log(colorize(`   Using: ${sourceFile}`, 'white'));
console.log(colorize(`   Found: ${mdData.length} weeks\n`, 'white'));

// Validate each week
for (const week of mdData) {
  console.log(colorize(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'cyan'));
  console.log(colorize(`Week ${week.number}`, 'bright'));
  console.log(colorize(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'cyan'));

  for (const day of week.days) {
    console.log(colorize(`\n  ${day.name}:`, 'yellow'));

    for (const section of day.sections) {
      console.log(colorize(`    └─ ${section.name}`, 'white'));

      for (const exercise of section.exercises) {
        results.total++;

        const validation = findExerciseInData(exercise.name, week.number, day.name, section.name);

        if (validation.found) {
          if (validation.correctSection) {
            results.found++;
            console.log(colorize(`       ✓ ${exercise.name}`, 'green'));

            // Check if details match
            if (exercise.details && validation.exercise) {
              const hasReps = validation.exercise.reps || validation.exercise.sets || validation.exercise.duration;
              if (hasReps) {
                console.log(colorize(`         Details: ${exercise.details}`, 'white'));
              } else {
                console.log(colorize(`         ⚠ Missing details in data.js`, 'yellow'));
              }
            }
          } else {
            results.misplaced++;
            console.log(colorize(`       ⚠ ${exercise.name}`, 'yellow'));
            console.log(colorize(`         Expected in: ${section.name}`, 'white'));
            console.log(colorize(`         Found in: ${validation.actualSection}`, 'white'));

            results.details.push({
              type: 'misplaced',
              week: week.number,
              day: day.name,
              exercise: exercise.name,
              expectedSection: section.name,
              actualSection: validation.actualSection
            });
          }
        } else {
          results.missing++;
          console.log(colorize(`       ✗ ${exercise.name}`, 'red'));
          console.log(colorize(`         Missing from data.js!`, 'red'));

          results.details.push({
            type: 'missing',
            week: week.number,
            day: day.name,
            section: section.name,
            exercise: exercise.name,
            details: exercise.details
          });
        }
      }
    }
  }
}

// Check for warmup and cooldown protocols
console.log(colorize(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'cyan'));
console.log(colorize(`Warmup & Cooldown Protocols`, 'bright'));
console.log(colorize(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'cyan'));

if (WARMUP_PROTOCOL && WARMUP_PROTOCOL.exercises) {
  console.log(colorize(`\n  ✓ Warmup Protocol: ${WARMUP_PROTOCOL.exercises.length} exercises`, 'green'));
} else {
  console.log(colorize(`\n  ✗ Warmup Protocol: Not found`, 'red'));
}

if (COOLDOWN_PROTOCOL && COOLDOWN_PROTOCOL.exercises) {
  console.log(colorize(`  ✓ Cooldown Protocol: ${COOLDOWN_PROTOCOL.exercises.length} exercises`, 'green'));
} else {
  console.log(colorize(`  ✗ Cooldown Protocol: Not found`, 'red'));
}

// Print summary
console.log(colorize(`\n\n═══════════════════════════════════════════════════════════`, 'cyan'));
console.log(colorize(`  Validation Summary`, 'cyan'));
console.log(colorize(`═══════════════════════════════════════════════════════════\n`, 'cyan'));

const successRate = ((results.found / results.total) * 100).toFixed(1);

console.log(colorize(`  Total exercises in markdown:  ${results.total}`, 'white'));
console.log(colorize(`  ✓ Found and correctly placed: ${results.found}`, 'green'));
console.log(colorize(`  ⚠ Found but misplaced:        ${results.misplaced}`, 'yellow'));
console.log(colorize(`  ✗ Missing from data.js:       ${results.missing}`, 'red'));
console.log(colorize(`\n  Success Rate: ${successRate}%\n`, successRate >= 90 ? 'green' : successRate >= 70 ? 'yellow' : 'red'));

// Print detailed issues if any
if (results.missing > 0 || results.misplaced > 0) {
  console.log(colorize(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'cyan'));
  console.log(colorize(`  Detailed Issues`, 'cyan'));
  console.log(colorize(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`, 'cyan'));

  if (results.missing > 0) {
    console.log(colorize(`  Missing Exercises:`, 'red'));
    results.details
      .filter(d => d.type === 'missing')
      .forEach((detail, index) => {
        console.log(colorize(`    ${index + 1}. Week ${detail.week} > ${detail.day} > ${detail.section}`, 'white'));
        console.log(colorize(`       Exercise: ${detail.exercise}`, 'white'));
        if (detail.details) {
          console.log(colorize(`       Details: ${detail.details}`, 'white'));
        }
        console.log();
      });
  }

  if (results.misplaced > 0) {
    console.log(colorize(`  Misplaced Exercises:`, 'yellow'));
    results.details
      .filter(d => d.type === 'misplaced')
      .forEach((detail, index) => {
        console.log(colorize(`    ${index + 1}. Week ${detail.week} > ${detail.day}`, 'white'));
        console.log(colorize(`       Exercise: ${detail.exercise}`, 'white'));
        console.log(colorize(`       Expected section: ${detail.expectedSection}`, 'white'));
        console.log(colorize(`       Actual section: ${detail.actualSection}`, 'white'));
        console.log();
      });
  }
}

// Check for extras in data.js not in markdown
console.log(colorize(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'cyan'));
console.log(colorize(`  Reverse Validation (data.js → markdown)`, 'cyan'));
console.log(colorize(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`, 'cyan'));

let totalInDataJs = 0;
let notInMarkdown = 0;

if (EIGHT_WEEK_PROGRAM && EIGHT_WEEK_PROGRAM.program) {
  for (let weekNum = 1; weekNum <= 8; weekNum++) {
    const weekKey = `week${weekNum}`;
    const weekData = EIGHT_WEEK_PROGRAM.program[weekKey];

    if (weekData) {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

      for (const dayKey of days) {
        const dayData = weekData[dayKey];
        if (dayData && dayData.sections) {
          for (const section of dayData.sections) {
            for (const exercise of section.exercises) {
              totalInDataJs++;

              // Check if this exercise exists in markdown
              const mdWeek = mdData.find(w => w.number === weekNum);
              let foundInMd = false;

              if (mdWeek) {
                const mdDay = mdWeek.days.find(d => normalize(d.name) === normalize(dayKey));
                if (mdDay) {
                  for (const mdSection of mdDay.sections) {
                    if (mdSection.exercises.some(e => normalize(e.name) === normalize(exercise.name))) {
                      foundInMd = true;
                      break;
                    }
                  }
                }
              }

              if (!foundInMd) {
                notInMarkdown++;
                console.log(colorize(`  ⚠ Week ${weekNum} > ${dayKey} > ${section.name}`, 'yellow'));
                console.log(colorize(`     Exercise in data.js but not in markdown: ${exercise.name}`, 'white'));
              }
            }
          }
        }
      }
    }
  }
}

console.log(colorize(`\n  Total exercises in data.js: ${totalInDataJs}`, 'white'));
console.log(colorize(`  Not found in markdown: ${notInMarkdown}`, notInMarkdown > 0 ? 'yellow' : 'green'));

// Final verdict
console.log(colorize(`\n\n═══════════════════════════════════════════════════════════`, 'cyan'));
console.log(colorize(`  Final Verdict`, 'cyan'));
console.log(colorize(`═══════════════════════════════════════════════════════════\n`, 'cyan'));

if (results.missing === 0 && results.misplaced === 0 && notInMarkdown === 0) {
  console.log(colorize(`  🎉 PERFECT! All data is accurate and complete!`, 'green'));
} else if (results.missing === 0 && results.misplaced === 0) {
  console.log(colorize(`  ✅ GOOD! All markdown exercises are in data.js`, 'green'));
  console.log(colorize(`  ℹ️  Note: data.js has ${notInMarkdown} additional exercise(s)`, 'blue'));
} else if (successRate >= 90) {
  console.log(colorize(`  ⚠️  MOSTLY COMPLETE! Success rate: ${successRate}%`, 'yellow'));
  console.log(colorize(`     Some exercises need attention`, 'yellow'));
} else {
  console.log(colorize(`  ❌ NEEDS WORK! Success rate: ${successRate}%`, 'red'));
  console.log(colorize(`     Significant data gaps found`, 'red'));
}

console.log();

// Exit code based on validation
process.exit(results.missing > 0 ? 1 : 0);
