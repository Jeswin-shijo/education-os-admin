import { initials } from '../lib/format';

export function Avatar({ name, size = 40, color = '#13327F' }: { name: string; size?: number; color?: string }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </div>
  );
}
