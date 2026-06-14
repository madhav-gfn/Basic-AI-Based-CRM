'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: '◆' },
  { href: '/campaigns', label: 'Campaigns', icon: '◈' },
  { href: '/campaigns/new', label: 'Create Campaign', icon: '✦' },
  { href: '/segments', label: 'Segments', icon: '◇' },
  { href: '/customers', label: 'Customers', icon: '○' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-[var(--color-border)] flex flex-col z-50">
      {/* Brand */}
      <div className="px-6 py-6 border-b border-[var(--color-border)]">
        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-primary)' }}>
          Moda CRM
        </h1>
        <p className="text-[11px] font-medium mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          AI-Native D2C Intelligence
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                ${isActive
                  ? 'text-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-gray-50'
                }
              `}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-[var(--color-border)]">
        <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
          Xeno Assignment
        </p>
      </div>
    </aside>
  );
}
