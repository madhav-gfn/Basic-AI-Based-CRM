'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import Image from 'next/image';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '/dashboard.png' },
  { href: '/campaigns', label: 'Campaigns', icon: '/campaign.png' },
  { href: '/campaigns/new', label: 'Create Campaign', icon: '/Create_campaign.png' },
  { href: '/segments', label: 'Segments', icon: '/segment.png' },
  { href: '/customers', label: 'Customers', icon: '/customers.png' },
  { href: '/import', label: 'AI CSV Import', icon: '/orders.png' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[var(--color-sidebar)] border-r border-[var(--color-border)] flex flex-col z-50">
      {/* Brand */}
      <div className="px-6 py-6 border-b border-[var(--color-border)] flex items-center gap-3">
        <Image src="/main_logo.png" alt="Moda CRM Logo" width={40} height={40} className="rounded" />
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
            Moda CRM
          </h1>
          <p className="text-[11px] font-medium mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            AI-Native D2C Intelligence
          </p>
        </div>
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
              <Image src={item.icon} alt={item.label} width={20} height={20} className={isActive ? "" : "opacity-60"} />
              <span className="flex-1">{item.label}</span>
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
