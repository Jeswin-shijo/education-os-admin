import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Logo } from '../components/Logo';
import { cn } from '../lib/cn';
import { navGroups, type NavItem } from './navigation';

// A nav item owns the current route if the path matches it or (for a hub) any of its
// tab children — used both to highlight the link and to auto-open its group.
function itemActive(item: NavItem, pathname: string): boolean {
  if (item.to === '/') return pathname === '/';
  const matches = (to: string) => pathname === to || pathname.startsWith(to + '/');
  return matches(item.to) || (item.children?.some((c) => matches(c.to)) ?? false);
}

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const activeGroup = navGroups.find((g) => g.title && g.items.some((it) => itemActive(it, pathname)))?.title;

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    activeGroup ? { [activeGroup]: true } : {},
  );

  // Keep the group that owns the current route open as the user navigates around.
  useEffect(() => {
    if (activeGroup) setExpanded((e) => (e[activeGroup] ? e : { ...e, [activeGroup]: true }));
  }, [activeGroup]);

  const renderLink = (item: NavItem) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.to === '/'}
      onClick={onNavigate}
      className={() =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2.5 text-body font-medium transition-colors',
          itemActive(item, pathname) ? 'bg-accent text-navy-dark font-semibold' : 'text-navy-soft hover:bg-navy',
        )
      }
    >
      <Icon name={item.icon} size={18} />
      {item.label}
    </NavLink>
  );

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-dark transition-transform lg:static lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Logo size={36} />
        <div className="leading-tight">
          <div className="text-title text-white">AI Campus OS</div>
          <div className="text-caption text-navy-muted">Admin Console</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-6">
        {navGroups.map((group, i) => {
          // Ungrouped items (Dashboard, Audit Logs) are always visible.
          if (!group.title) {
            return (
              <div key={i} className="mb-1">
                {group.items.map(renderLink)}
              </div>
            );
          }

          const isOpen = expanded[group.title] ?? false;
          return (
            <div key={i} className="mb-1">
              <button
                type="button"
                onClick={() => setExpanded((e) => ({ ...e, [group.title!]: !isOpen }))}
                className="flex w-full items-center justify-between rounded-md px-3 pb-1.5 pt-3 text-caption uppercase tracking-wider text-navy-muted transition-colors hover:text-navy-soft"
                aria-expanded={isOpen}
              >
                <span>{group.title}</span>
                <Icon name={isOpen ? 'chevron-down' : 'chevron-right'} size={14} />
              </button>
              {isOpen && <div className="mt-0.5">{group.items.map(renderLink)}</div>}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
