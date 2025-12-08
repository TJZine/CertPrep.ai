"use client";
import * as React from "react";
import Link from "next/link";

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
    <aside className="w-64 border-r border-border bg-background px-4 py-6">
      <nav className="space-y-2 text-sm font-medium text-muted-foreground">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block rounded-md px-3 py-2 hover:bg-accent hover:text-accent-foreground"
          >
            {link.label}
          </Link>
        ))}
        {links.length === 0 ? (
          <div className="text-muted-foreground">Navigation coming soon.</div>
        ) : null}
      </nav>
    </aside>
  );
}

export default Sidebar;
