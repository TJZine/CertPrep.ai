export interface StudyStreak {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
}

const STUDY_STREAK_STORAGE_KEY = "study_streak";

const DEFAULT_STUDY_STREAK: StudyStreak = {
  currentStreak: 0,
  longestStreak: 0,
  lastStudyDate: null,
};

function createDefaultStudyStreak(): StudyStreak {
  return { ...DEFAULT_STUDY_STREAK };
}

function isValidStudyStreak(value: unknown): value is StudyStreak {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as StudyStreak).currentStreak === "number" &&
    Number.isInteger((value as StudyStreak).currentStreak) &&
    (value as StudyStreak).currentStreak >= 0 &&
    typeof (value as StudyStreak).longestStreak === "number" &&
    Number.isInteger((value as StudyStreak).longestStreak) &&
    (value as StudyStreak).longestStreak >= 0 &&
    (value as StudyStreak).longestStreak >= (value as StudyStreak).currentStreak &&
    (typeof (value as StudyStreak).lastStudyDate === "string" ||
      (value as StudyStreak).lastStudyDate === null)
  );
}

function persistStudyStreak(streak: StudyStreak): void {
  localStorage.setItem(STUDY_STREAK_STORAGE_KEY, JSON.stringify(streak));
}

function repairStudyStreak(): StudyStreak {
  const streak = createDefaultStudyStreak();

  try {
    persistStudyStreak(streak);
  } catch {
    // Return a safe fallback even if repair-write fails.
  }

  return streak;
}

function isLocalStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const key = "__certprep_streak_test__";
    window.localStorage.setItem(key, "1");
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function getStudyStreak(): StudyStreak {
  if (!isLocalStorageAvailable()) {
    return createDefaultStudyStreak();
  }

  const stored = localStorage.getItem(STUDY_STREAK_STORAGE_KEY);
  if (!stored) {
    return createDefaultStudyStreak();
  }
  try {
    const parsed = JSON.parse(stored);

    if (!isValidStudyStreak(parsed)) {
      return repairStudyStreak();
    }

    return parsed;
  } catch {
    return repairStudyStreak();
  }
}

export function updateStudyStreak(): StudyStreak {
  if (!isLocalStorageAvailable()) {
    return { currentStreak: 0, longestStreak: 0, lastStudyDate: null };
  }

  const streak = getStudyStreak();
  // Use local time for streak calculation, not UTC
  const today = new Date().toLocaleDateString("en-CA");

  if (streak.lastStudyDate === today) {
    return streak;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString("en-CA");

  if (streak.lastStudyDate === yesterdayStr) {
    streak.currentStreak += 1;
  } else {
    streak.currentStreak = 1;
  }

  streak.longestStreak = Math.max(streak.currentStreak, streak.longestStreak);
  streak.lastStudyDate = today;

  persistStudyStreak(streak);
  return streak;
}
