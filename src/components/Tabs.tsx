import { NavLink } from 'react-router-dom';
import { cn } from '../lib/cn';

export type TabItem = { to: string; label: string };

/**
 * Route-driven hub tabs — refined "premium underline" treatment.
 *
 * Each tab is a real NavLink, so the active tab tracks the URL (deep links +
 * back/forward work for free) and NavLink sets aria-current="page" on the active
 * one automatically. We deliberately do NOT fake role="tablist"/"tab": these are
 * navigation links, not an in-page ARIA tab widget, so honest link semantics are
 * correct for assistive tech.
 *
 * Active tab = text-ink + semibold with a 2px gold (bg-accent) underline — the
 * token system's sparing, framing use of the accent (never gold text, never a
 * fill), so it reads as "you are here" and never competes with the sub-page <h1>.
 * Inactive tabs grow a soft grey underline from the left on hover. One full-width
 * hairline sits under the row; it scrolls horizontally on narrow screens with the
 * scrollbar hidden across engines, and keyboard focus shows an inset navy ring
 * (inset so horizontal-scroll clipping can never crop it).
 */
export function Tabs({ items, ariaLabel = 'Sections' }: { items: TabItem[]; ariaLabel?: string }) {
  return (
    <nav aria-label={ariaLabel} className="border-b border-line">
      <div className="-mb-px flex gap-1 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              cn(
                'group relative shrink-0 whitespace-nowrap px-4 py-3 text-small transition-colors',
                'focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy',
                isActive ? 'font-semibold text-ink' : 'font-medium text-ink-muted hover:text-ink',
              )
            }
          >
            {({ isActive }) => (
              <>
                {t.label}
                {/* Active = solid gold underline; inactive grows a soft grey line on
                    hover. Animation is skipped under prefers-reduced-motion. */}
                <span
                  aria-hidden
                  className={cn(
                    'pointer-events-none absolute inset-x-3 bottom-0 h-0.5 origin-left rounded-full transition-transform duration-200 ease-out motion-reduce:transition-none',
                    isActive ? 'scale-x-100 bg-accent' : 'scale-x-0 bg-line group-hover:scale-x-100',
                  )}
                />
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
