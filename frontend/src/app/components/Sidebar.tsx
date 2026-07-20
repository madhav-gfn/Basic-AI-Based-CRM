'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { useAuth } from '@/lib/auth-context';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '/dashboard.png' },
  { href: '/campaigns', label: 'Campaigns', icon: '/campaign.png' },
  { href: '/campaigns/new', label: 'Create Campaign', icon: '/Create_campaign.png' },
  { href: '/journeys', label: 'Journeys', icon: '/revenue.png' },
  { href: '/segments', label: 'Segments', icon: '/segment.png' },
  { href: '/templates', label: 'Templates', icon: '/segment.png' },
  { href: '/customers', label: 'Customers', icon: '/customers.png' },
  { href: '/import', label: 'AI CSV Import', icon: '/orders.png' },
];

const COLLAPSED_STORAGE_KEY = 'sidebar-collapsed';

/** Longest matching href wins, so nested routes (e.g. /campaigns/new) never
 * light up their parent (/campaigns) at the same time. */
function findActiveHref(pathname: string): string | undefined {
  return NAV_ITEMS
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

/**
 * Sits in normal flex flow (not an overlay) so the main content reflows as
 * it resizes. Collapsed state is user-toggled via the burger button and
 * persisted across visits.
 */
export default function Sidebar() {
  const pathname = usePathname();
  const activeHref = findActiveHref(pathname);
  const { user, isLoading: authLoading, logout } = useAuth();

  // Start with false (matches SSR), then sync from localStorage after mount
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true');
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return (
    <aside
      className={cn(
        'h-screen shrink-0 overflow-hidden bg-[var(--color-sidebar)] border-r border-[var(--color-border)]',
        'flex flex-col z-50 transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand + burger toggle */}
      <div className={cn('py-6 px-4 border-b border-[var(--color-border)] flex items-center gap-3', collapsed && 'flex-col gap-4')}>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-pressed={!collapsed}
          className="shrink-0 p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors duration-150"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M2.5 5.5h15M2.5 10h15M2.5 14.5h15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <div className="min-w-0 flex items-center gap-3">
          <Image src="/main_logo.png" alt="Saucer AI Logo" width={40} height={40} className="rounded-lg shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight leading-tight whitespace-nowrap" style={{ color: 'var(--color-text)' }}>
                Saucer AI
              </h1>
              <p className="text-[11px] font-medium mt-0.5 whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                AI-Native D2C Intelligence
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === activeHref;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              title={item.label}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                collapsed && 'justify-center',
                isActive
                  ? 'text-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
              )}
            >
              <Image src={item.icon} alt="" width={20} height={20} className={cn('shrink-0', isActive ? '' : 'opacity-60')} />
              {!collapsed && <span className="flex-1 whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Auth footer */}
      <div className={cn('px-3 py-4 border-t border-[var(--color-border)]', collapsed && 'px-2')}>
        {!authLoading && user ? (
          <div className={cn('flex items-center gap-2.5', collapsed && 'flex-col')}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
              style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}
              title={user.name}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate">{user.name}</p>
                <p className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>{user.email}</p>
              </div>
            )}
            <button
              type="button"
              onClick={logout}
              aria-label="Sign out"
              title="Sign out"
              className="shrink-0 p-1.5 rounded-md hover:bg-[var(--color-surface-hover)] transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M7.5 17.5H4.5a1 1 0 01-1-1v-13a1 1 0 011-1h3M13.5 14l4-4-4-4M17.5 10h-10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        ) : !authLoading ? (
          <Link
            href="/login"
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              collapsed && 'justify-center',
              'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
            )}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="shrink-0">
              <path d="M7.5 17.5H4.5a1 1 0 01-1-1v-13a1 1 0 011-1h3M13.5 14l4-4-4-4M17.5 10h-10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" transform="rotate(180 10 10)" />
            </svg>
            {!collapsed && <span>Sign In</span>}
          </Link>
        ) : null}
      </div>
    </aside>
  );
}
