import { useState } from 'react';
import { useAuth } from '../state/AuthContext';
import { Avatar, Icon } from '../components';

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { admin, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 lg:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-surface-alt lg:hidden"
        aria-label="Open menu"
      >
        <Icon name="menu" size={20} />
      </button>
      <div className="hidden lg:block" />
      <div className="relative">
        <button type="button" onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-surface-alt">
          {admin && <Avatar name={admin.name} size={34} color={admin.avatarColor} />}
          <div className="hidden text-left sm:block">
            <div className="text-small font-semibold text-ink leading-tight">{admin?.name}</div>
            <div className="text-caption capitalize text-ink-muted leading-tight">{admin?.role}</div>
          </div>
          <Icon name="chevron-down" size={16} className="text-ink-soft" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-10 mt-2 w-44 rounded-lg border border-line bg-surface py-1.5 shadow-lg">
            <button
              type="button"
              onClick={() => logout()}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-small text-danger hover:bg-danger-soft"
            >
              <Icon name="logout" size={16} />
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
