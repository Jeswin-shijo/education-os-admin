import { Icon } from './Icon';

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search…',
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <span className="relative flex-1">
      <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
      <input
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-line bg-surface py-2.5 pl-9 pr-3 text-body text-ink outline-none transition-colors focus:border-navy focus:ring-2 focus:ring-navy-soft"
      />
    </span>
  );
}
