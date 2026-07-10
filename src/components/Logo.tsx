export function Logo({ size = 40, rounded = true }: { size?: number; rounded?: boolean }) {
  return (
    <img
      src="/logo.png"
      width={size}
      height={size}
      alt="Dhanalakshmi Srinivasan University"
      style={{
        display: 'block',
        objectFit: 'contain',
        borderRadius: rounded ? '50%' : 0,
      }}
    />
  );
}
