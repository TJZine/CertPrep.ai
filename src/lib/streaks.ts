export interface StudyStreak {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
}

function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const key = '__certprep_streak_test__';
    window.localStorage.setItem(key, '1');
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function getStudyStreak(): StudyStreak {
  if (!isLocalStorageAvailable()) {
    return { currentStreak: 0, longestStreak: 0, lastStudyDate: null };
  }

  const stored = localStorage.getItem('study_streak');
  if (!stored) {
    return { currentStreak: 0, longestStreak: 0, lastStudyDate: null };
  }
  try {
    return JSON.parse(stored) as StudyStreak;
  } catch {
    return { currentStreak: 0, longestStreak: 0, lastStudyDate: null };
  }
}

export function updateStudyStreak(): StudyStreak {
  if (!isLocalStorageAvailable()) {
    return { currentStreak: 0, longestStreak: 0, lastStudyDate: null };
  }

  const streak = getStudyStreak();
  // Use local time for streak calculation, not UTC
  const today = new Date().toLocaleDateString('en-CA');

  if (streak.lastStudyDate === today) {
    return streak;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (streak.lastStudyDate === yesterdayStr) {
    streak.currentStreak += 1;
  } else {
    streak.currentStreak = 1;
  }

  streak.longestStreak = Math.max(streak.currentStreak, streak.longestStreak);
  streak.lastStudyDate = today;

  localStorage.setItem('study_streak', JSON.stringify(streak));
  return streak;
}
