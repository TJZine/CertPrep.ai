'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, BookOpen, Home, Library, Settings as SettingsIcon } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/common/ThemeToggle';

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

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-50"
          aria-label="CertPrep.ai home"
        >
          <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <span>{APP_NAME}</span>
        </Link>
        <div className="flex items-center gap-3">
          <nav aria-label="Main navigation" className="flex items-center gap-2">
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
        </div>
      </div>
    </header>
  );
}

export default Header;
