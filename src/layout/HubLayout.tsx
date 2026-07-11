import { Outlet } from 'react-router-dom';
import { Tabs, type TabItem } from '../components/Tabs';

/**
 * Shell for a tabbed hub: a section header (gold tick + hub title + blurb), the
 * refined underline tab bar, then the active sub-page via <Outlet>. Each sub-page
 * keeps its own PageHeader (its <h1>, count, action button) unchanged.
 *
 * Why the active tab never reads as a duplicate of the sub-page <h1>:
 *  - Size ladder: the hub title is text-display (30px), which out-ranks the
 *    sub-page's text-h1 (24px), so the eye reads section -> tabs -> page.
 *  - The hub title is a <p>, not a heading, so the sub-page keeps the document's
 *    single, correctly-ordered <h1>; the tab bar's labelled <nav> carries the hub
 *    name for assistive tech.
 *  - The underline tab bar's own full-width hairline seals the navigation zone off
 *    from the content zone below.
 *
 * `title`/`blurb` are optional so a hub without copy still renders cleanly (tabs only).
 */
export function HubLayout({
  title,
  blurb,
  tabs,
}: {
  title?: string;
  blurb?: string;
  tabs: TabItem[];
}) {
  return (
    <div>
      {title && (
        <header className="mb-4">
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-7 w-1.5 shrink-0 rounded-full bg-accent" />
            <p className="text-display text-ink">{title}</p>
          </div>
          {blurb && <p className="mt-2 max-w-2xl text-small text-ink-muted">{blurb}</p>}
        </header>
      )}

      <div className="mb-6">
        <Tabs items={tabs} ariaLabel={title ? `${title} sections` : 'Sections'} />
      </div>

      <Outlet />
    </div>
  );
}
