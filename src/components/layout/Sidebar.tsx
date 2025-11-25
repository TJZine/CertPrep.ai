'use client';
import * as React from 'react';
import Link from 'next/link';

export interface SidebarLink {
  href: string;
  label: string;
}

export interface SidebarProps {
  links?: SidebarLink[];
}

/**
 * Simple navigation sidebar placeholder.
 */
export function Sidebar({ links = [] }: SidebarProps): React.ReactElement {
  return (
    <aside className="w-64 border-r border-slate-200 bg-white px-4 py-6">
      <nav className="space-y-2 text-sm font-medium text-slate-700">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="block rounded-md px-3 py-2 hover:bg-slate-50">
            {link.label}
          </Link>
        ))}
        {links.length === 0 ? <div className="text-slate-500">Navigation coming soon.</div> : null}
      </nav>
    </aside>
  );
}

export default Sidebar;
