# CertPrep.ai - Comprehensive Testing Checklist

Use this checklist to verify all features before release.

## Pre-Testing Setup

```bash
rm -rf node_modules .next
npm install
npm run build
npm run start
```

---

## 1. Dashboard Tests

### 1.1 Initial State (Empty)
- [ ] Dashboard loads without errors
- [ ] "No quizzes yet" empty state displays
- [ ] Import button is visible and clickable
- [ ] Header navigation works
- [ ] Footer displays version and privacy notice

### 1.2 Quiz Import
- [ ] Click "Import Quiz" opens modal
- [ ] Modal has two tabs: Paste JSON / Upload File
- [ ] Tab switching works

#### Paste JSON Tab
- [ ] Textarea accepts JSON input
- [ ] Valid JSON shows success indicators:
  - [ ] "Valid JSON structure" ✓
  - [ ] "Title: [quiz title]" ✓
  - [ ] "[N] questions found" ✓
- [ ] Invalid JSON shows error messages with specific issues
- [ ] Import button disabled until JSON valid
- [ ] Clicking Import creates quiz and closes modal
- [ ] Success toast appears
- [ ] Quiz card appears in grid

#### Upload File Tab
- [ ] Click to select file works
- [ ] Drag and drop works
- [ ] Only .json files accepted
- [ ] File validation shows results
- [ ] Import works from file

### 1.3 Quiz Card Display
- [ ] Title displayed (truncates if long)
- [ ] Description or question count shown
- [ ] Tags display (max 3 with "+N" for more)
- [ ] Stats show: Questions, Attempts, Last Score
- [ ] "Start Quiz" button visible

### 1.4 Quiz Card Actions
- [ ] Three-dot menu opens on click
- [ ] Menu closes when clicking outside
- [ ] Delete option shows confirmation modal
- [ ] Confirm delete removes quiz and shows toast
- [ ] Cancel closes modal without deleting

### 1.5 Stats Bar (with quizzes)
- [ ] Shows after importing quizzes
- [ ] Displays: Total Quizzes, Attempts, Avg Score, Study Time
- [ ] Updates after completing quizzes

---

## 2. Zen Study Mode Tests

### 2.1 Mode Selection
- [ ] Click "Start Quiz" opens mode modal
- [ ] Zen mode selected by default
- [ ] "Recommended" badge on Zen
- [ ] Features listed for both modes
- [ ] Clicking mode card selects it
- [ ] "Start Study" button works
- [ ] Navigates to /quiz/[id]/zen

### 2.2 Quiz Interface
- [ ] Quiz loads without errors
- [ ] Question displays with category and difficulty
- [ ] Options displayed as clickable buttons
- [ ] Timer counting UP visible
- [ ] Progress bar shows current position
- [ ] Flag button visible

### 2.3 Answer Selection (Before Submit)
- [ ] Click option → highlights blue
- [ ] Click different option → selection changes
- [ ] Keyboard A/B/C/D selects option
- [ ] No green/red feedback yet
- [ ] "Check Answer" button enabled when selected

### 2.4 Answer Submission (Correct)
- [ ] Click "Check Answer"
- [ ] Selected option turns GREEN
- [ ] "Correct! 🎉" toast appears
- [ ] "View Explanation" toggle visible
- [ ] Spaced repetition buttons appear: Again/Hard/Good
- [ ] Clicking explanation toggle shows/hides explanation

### 2.5 Answer Submission (Incorrect)
- [ ] Selected option turns RED
- [ ] Correct answer highlighted GREEN
- [ ] Explanation auto-expands
- [ ] Distractor logic shown (if available)
- [ ] AI Tutor button appears
- [ ] Spaced repetition buttons appear

### 2.6 AI Tutor
- [ ] Click "Copy AI Prompt"
- [ ] "Copied!" toast appears
- [ ] Button changes to checkmark
- [ ] Paste clipboard → verify prompt includes:
  - [ ] Category
  - [ ] Question text
  - [ ] Your answer
  - [ ] Correct answer
  - [ ] Explanation
- [ ] "Open ChatGPT" opens new tab

### 2.7 Spaced Repetition
#### Again Button
- [ ] Click "Again" or press "1"
- [ ] Advances to next question
- [ ] After 3 questions, original reappears

#### Hard Button
- [ ] Click "Hard" or press "2"
- [ ] Advances to next question
- [ ] Question marked for review

#### Good Button
- [ ] Click "Good" or press "3"
- [ ] Advances to next question
- [ ] Question doesn't reappear

### 2.8 Flagging
- [ ] Click flag button or press "F"
- [ ] Flag icon changes (filled)
- [ ] Flagged indicator visible
- [ ] Flag persists when navigating

### 2.9 Session Completion
- [ ] Complete all questions
- [ ] "Finish" shown on last question
- [ ] Click Finish
- [ ] "Study session complete!" toast
- [ ] Redirects to results page

### 2.10 Exit Flow
- [ ] Click back arrow or X
- [ ] Confirmation modal appears
- [ ] "Continue Quiz" closes modal
- [ ] "Exit Quiz" returns to dashboard

### 2.11 Keyboard Navigation
- [ ] Tab through elements → focus rings visible
- [ ] Enter activates buttons
- [ ] A/B/C/D select options
- [ ] 1/2/3 for spaced repetition (after submit)
- [ ] F toggles flag

---

## 3. Proctor Exam Mode Tests

### 3.1 Mode Selection
- [ ] Select Proctor mode in modal
- [ ] Features listed correctly
- [ ] "Start Exam" button works
- [ ] Navigates to /quiz/[id]/proctor

### 3.2 Quiz Interface
- [ ] Timer counting DOWN visible
- [ ] Timer shows calculated duration
- [ ] Question navigator sidebar visible (desktop)
- [ ] Mobile strip visible (small screens)
- [ ] No immediate feedback on answers

### 3.3 Answer Selection
- [ ] Click option → highlights BLUE only
- [ ] NO green/red feedback
- [ ] "Answer recorded" indicator appears
- [ ] Selection saved when navigating away

### 3.4 Navigation
- [ ] Previous button works (disabled on first)
- [ ] Next button works (disabled on last)
- [ ] Arrow keys navigate
- [ ] Click question number in sidebar → jumps
- [ ] Existing answer shown when returning

### 3.5 Question Navigator
- [ ] Correct colors:
  - [ ] Gray: Unseen
  - [ ] Light gray: Seen
  - [ ] Blue: Answered
  - [ ] Orange: Flagged
- [ ] Current question has ring
- [ ] Stats show counts

### 3.6 Timer Warning
- [ ] Timer turns RED at 5 minutes remaining

### 3.7 Manual Submit
- [ ] Click "Submit Exam"
- [ ] Confirmation modal shows:
  - [ ] Time remaining
  - [ ] Answered count
  - [ ] Unanswered count
  - [ ] Flagged count
- [ ] Warning if unanswered
- [ ] "Continue Reviewing" closes modal
- [ ] "Submit Exam" submits and redirects

### 3.8 Time's Up (Auto-Submit)
- [ ] Timer reaches 0
- [ ] TimeUp modal appears (can't dismiss)
- [ ] Shows answered count
- [ ] "View Results" navigates to results

### 3.9 Exit Flow
- [ ] Same as Zen mode
- [ ] Warning mentions Proctor mode

---

## 4. Results Page Tests

### 4.1 Page Load
- [ ] Results page loads after quiz
- [ ] Scorecard displays prominently
- [ ] Score percentage large and visible
- [ ] Performance tier badge (Excellent/Good/etc.)

### 4.2 Scorecard
- [ ] Correct count shown
- [ ] Incorrect count shown
- [ ] Duration displayed
- [ ] Mode displayed
- [ ] Date displayed
- [ ] Trend indicator (if previous attempt)

### 4.3 Topic Radar
- [ ] Radar chart renders
- [ ] All categories shown
- [ ] Hover shows details
- [ ] Strongest/weakest highlighted

### 4.4 Results Summary
- [ ] Stats grid: Correct, Incorrect, Unanswered, Flagged
- [ ] Time stats displayed

### 4.5 Smart Actions
#### Review Missed
- [ ] Scrolls to question review
- [ ] Filter set to "Incorrect"

#### AI Study Plan
- [ ] Click copies prompt
- [ ] Toast confirms
- [ ] Prompt includes all missed questions

#### Smart Round
- [ ] Modal shows question count
- [ ] Click Start → Zen mode with filtered questions
- [ ] Smart Round banner visible

### 4.6 Question Review
- [ ] Filter buttons work: All/Correct/Incorrect/Flagged
- [ ] Expand/Collapse All works
- [ ] Question cards expandable
- [ ] Correct answers shown green
- [ ] Wrong answers shown red
- [ ] Explanation visible

### 4.7 Actions
- [ ] "Retake Quiz" starts same mode
- [ ] "Dashboard" returns home
- [ ] Share copies result text
- [ ] Delete shows confirmation
- [ ] Delete removes and redirects

---

## 5. Analytics Page Tests

### 5.1 Empty State
- [ ] Shows "No Data Yet" message
- [ ] Link to start quiz

### 5.2 With Data
- [ ] Overview stats load
- [ ] Score distribution chart renders
- [ ] Study time chart renders
- [ ] Performance history shows trend
- [ ] Weak areas identified
- [ ] Category breakdown visible

### 5.3 Interaction
- [ ] Click result → navigates to detail
- [ ] Charts interactive (hover tooltips)

---

## 6. Settings Page Tests

### 6.1 Navigation
- [ ] Navigate to /settings
- [ ] Page loads correctly

### 6.2 Data Management
#### Export
- [ ] Click Export
- [ ] JSON file downloads
- [ ] Contains quizzes and results

#### Import
- [ ] Click Import
- [ ] Select backup file
- [ ] Modal shows preview
- [ ] Merge mode works
- [ ] Replace mode works
- [ ] Success toast shows counts

#### Reset
- [ ] Click Reset
- [ ] Confirmation modal appears
- [ ] Cancel closes modal
- [ ] Confirm clears data
- [ ] Page reloads to empty state

---

## 7. PWA Tests

### 7.1 Install Prompt (if supported)
- [ ] Prompt appears after delay
- [ ] Install works
- [ ] Dismiss hides for 7 days

### 7.2 Offline Support
- [ ] Go offline
- [ ] Offline indicator appears
- [ ] App still functions
- [ ] Data operations work
- [ ] Go online → "Back online" message

### 7.3 Service Worker
- [ ] Check DevTools > Application > Service Workers
- [ ] SW registered and active
- [ ] Cache populated

---

## 8. Accessibility Tests

### 8.1 Keyboard Navigation
- [ ] Tab through entire app
- [ ] All interactive elements focusable
- [ ] Focus rings visible
- [ ] Enter activates buttons/links
- [ ] Escape closes modals

### 8.2 Screen Reader (Optional)
- [ ] Navigate with screen reader
- [ ] Labels announced correctly
- [ ] Dynamic content announced

### 8.3 Color Contrast
- [ ] Use browser accessibility tools
- [ ] Check text contrast ratios
- [ ] Check button/badge contrast

---

## 9. Responsive Design Tests

### 9.1 Mobile (375px)
- [ ] Dashboard grid stacks
- [ ] Quiz interface usable
- [ ] Navigation works
- [ ] Charts resize

### 9.2 Tablet (768px)
- [ ] Two-column grids where expected
- [ ] Sidebar hidden (quiz)
- [ ] Strip navigator shown

### 9.3 Desktop (1280px+)
- [ ] Full layouts
- [ ] Sidebar visible (proctor)
- [ ] Multi-column grids

---

## 10. Error Handling Tests

### 10.1 Invalid Quiz ID
- [ ] Navigate to /quiz/invalid-id/zen
- [ ] "Quiz Not Found" error shows
- [ ] Back button works

### 10.2 Invalid Result ID
- [ ] Navigate to /results/invalid-id
- [ ] "Result Not Found" error shows

### 10.3 Database Error
- [ ] Error message displays if DB fails
- [ ] Recovery options available

---

## Final Checks

- [ ] No console errors in production build
- [ ] All pages load under 3 seconds
- [ ] No obvious memory leaks
- [ ] Build completes without warnings

---

## Sign-Off

| Item | Tester | Date | Pass/Fail |
|------|--------|------|-----------|
| Dashboard | | | |
| Zen Mode | | | |
| Proctor Mode | | | |
| Results | | | |
| Analytics | | | |
| Settings | | | |
| PWA | | | |
| Accessibility | | | |
| Responsive | | | |
| Error Handling | | | |

Overall Status: ____________

Notes:
