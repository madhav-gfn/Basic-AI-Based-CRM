'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '/dashboard.png' },
  { href: '/campaigns', label: 'Campaigns', icon: '/campaign.png' },
  { href: '/campaigns/new', label: 'Create Campaign', icon: '/Create_campaign.png' },
  { href: '/segments', label: 'Segments', icon: '/segment.png' },
  { href: '/customers', label: 'Customers', icon: '/customers.png' },
  { href: '/import', label: 'AI CSV Import', icon: '/orders.png' },
];

const COLLAPSED_STORAGE_KEY = 'sidebar-collapsed';

/** Tiny external store so the collapsed flag stays in sync with localStorage
 * (and across multiple mounts) without setting state inside an effect. */
const collapsedStore = {
  listeners: new Set<() => void>(),
  subscribe(callback: () => void) {
    collapsedStore.listeners.add(callback);
    return () => collapsedStore.listeners.delete(callback);
  },
  getSnapshot() {
    return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true';
  },
  getServerSnapshot() {
    return false;
  },
  set(value: boolean) {
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(value));
    collapsedStore.listeners.forEach((listener) => listener());
  },
};

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
  const collapsed = useSyncExternalStore(
    collapsedStore.subscribe,
    collapsedStore.getSnapshot,
    collapsedStore.getServerSnapshot
  );

  const toggleCollapsed = () => collapsedStore.set(!collapsed);

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
          className="shrink-0 p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)]
            hover:bg-[var(--color-surface-hover)] transition-colors duration-150"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M2.5 5.5h15M2.5 10h15M2.5 14.5h15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <div className="min-w-0 flex items-center gap-3">
          <Image src="/main_logo.png" alt="Moda CRM Logo" width={40} height={40} className="rounded-lg shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight leading-tight whitespace-nowrap" style={{ color: 'var(--color-text)' }}>
                Moda CRM
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
    </aside>
  );
}
