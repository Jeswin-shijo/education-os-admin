import { initials } from '../lib/format';

export function Avatar({
  name,
  size = 40,
  color = '#13327F',
  uri,
}: {
  name: string;
  size?: number;
  color?: string;
  uri?: string;
}) {
  if (uri) {
    return (
      <img
        src={uri}
        alt={name}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </div>
  );
}
