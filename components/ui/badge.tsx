import * as React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'secondary' | 'outline';
const variants: Record<BadgeVariant, string> = {
  default: 'border-transparent bg-[#2563EB] text-white',
  secondary: 'border-transparent bg-slate-100 text-slate-700',
  outline: 'text-slate-700',
};

export function Badge({ className, variant = 'default', ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: BadgeVariant }) {
  return <div className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold transition', variants[variant], className)} {...props} />;
}
