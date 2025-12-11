"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border bg-background px-4 py-6">
      <nav className="space-y-2 text-sm font-medium text-muted-foreground">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative block rounded-md px-3 py-2 transition-colors",
                isActive
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-md bg-primary"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative z-10">{link.label}</span>
            </Link>
          );
        })}
        {links.length === 0 ? (
          <div className="text-muted-foreground">Navigation coming soon.</div>
        ) : null}
      </nav>
    </aside>
  );
}

export default Sidebar;
