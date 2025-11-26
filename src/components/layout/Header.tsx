'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, BookOpen, Home, Library, Menu, Settings as SettingsIcon, X } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/bodyScrollLock';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Library', href: '/library', icon: Library },
  { name: 'Settings', href: '/settings', icon: SettingsIcon },
];

const linkBase =
  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900';

/**
 * Sticky application header with main navigation.
 */
export function Header(): React.ReactElement {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const mobilePanelId = React.useId();
  const firstMobileLinkRef = React.useRef<HTMLAnchorElement>(null);
  const toggleButtonRef = React.useRef<HTMLButtonElement>(null);
  const mobilePanelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect((): void => {
    // Close the mobile menu when navigating
    setIsMenuOpen(false);
  }, [pathname]);

  React.useEffect((): (() => void) | void => {
    if (!isMenuOpen) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [isMenuOpen]);

  React.useEffect(() => {
    const panel = mobilePanelRef.current;
    if (!panel) return;

    if (isMenuOpen) {
      panel.removeAttribute('inert');
    } else {
      panel.setAttribute('inert', '');
    }
  }, [isMenuOpen]);

  React.useEffect((): (() => void) | undefined => {
    if (!isMenuOpen) return undefined;

    const panelElements = mobilePanelRef.current
      ? Array.from(
          mobilePanelRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        )
      : [];

    const focusableList = (
      [toggleButtonRef.current, ...panelElements] as Array<HTMLElement | null>
    ).filter((el): el is HTMLElement => Boolean(el));

    (firstMobileLinkRef.current ?? focusableList[0])?.focus();

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!isMenuOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsMenuOpen(false);
        toggleButtonRef.current?.focus();
        return;
      }

      if (event.key === 'Tab') {
        if (!focusableList.length) return;
        const first = focusableList[0];
        const last = focusableList[focusableList.length - 1];
        if (!first || !last) return;
        if (event.shiftKey) {
          if (document.activeElement === first) {
            event.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return (): void => document.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  return (
    <header
      className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-50"
            aria-label={`${APP_NAME} home`}
          >
            <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <span className="whitespace-nowrap">{APP_NAME}</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <nav aria-label="Main navigation" className="hidden items-center gap-2 md:flex">
            {navigation.map((item) => {
              const isActive =
                item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    linkBase,
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-100'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-50',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
          <ThemeToggle />
          <button
            ref={toggleButtonRef}
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900 md:hidden"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            aria-controls={mobilePanelId}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile nav panel */}
      <div
        ref={mobilePanelRef}
        id={mobilePanelId}
        aria-hidden={!isMenuOpen}
        className={cn(
          'md:hidden',
          isMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0',
          'overflow-hidden transition-all duration-200 ease-out',
        )}
      >
        <div className="space-y-1 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <nav aria-label="Mobile navigation" className="space-y-1">
            {navigation.map((item, index) => {
              const isActive =
                item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium',
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-100'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  ref={index === 0 ? firstMobileLinkRef : undefined}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;
