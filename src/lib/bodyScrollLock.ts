/**
 * Shared body scroll lock with reference counting.
 */
let scrollLockCount = 0;
let previousOverflow: string | null = null;

export const lockBodyScroll = (): void => {
  if (typeof document === "undefined") return;
  if (scrollLockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  scrollLockCount += 1;
};

export const unlockBodyScroll = (): void => {
  if (typeof document === "undefined") return;
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0 && previousOverflow !== null) {
    document.body.style.overflow = previousOverflow;
    previousOverflow = null;
  }
};
