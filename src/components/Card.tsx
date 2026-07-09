import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  padded?: boolean;
};

export function Card({ children, padded = true, className, ...rest }: Props) {
  return (
    <div
      className={cn(
        'rounded-lg border border-line bg-surface shadow-[0_4px_10px_rgba(10,31,77,0.06)]',
        padded && 'p-4',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
