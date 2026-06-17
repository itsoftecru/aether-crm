'use client';
import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type DialogContextValue = { open: boolean; setOpen: (open: boolean) => void };
const DialogContext = React.createContext<DialogContextValue | null>(null);

export function Dialog({ open, defaultOpen = false, onOpenChange, children }: { open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode }) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const isOpen = open ?? internalOpen;
  const setOpen = React.useCallback((nextOpen: boolean) => { setInternalOpen(nextOpen); onOpenChange?.(nextOpen); }, [onOpenChange]);
  return <DialogContext.Provider value={{ open: isOpen, setOpen }}>{children}</DialogContext.Provider>;
}

export function DialogTrigger({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = React.useContext(DialogContext);
  return <Button variant="outline" className={className} onClick={() => context?.setOpen(true)} {...props} />;
}

export function DialogContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const context = React.useContext(DialogContext);
  if (!context?.open) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={() => context.setOpen(false)}><div role="dialog" aria-modal="true" className={cn('relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 text-slate-950 shadow-2xl', className)} onMouseDown={(event) => event.stopPropagation()} {...props}><button type="button" aria-label="Закрыть" className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-950" onClick={() => context.setOpen(false)}><X className="h-4 w-4" /></button>{children}</div></div>;
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('mb-4 space-y-1.5 text-left', className)} {...props} />; }
export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) { return <h2 className={cn('text-xl font-bold', className)} {...props} />; }
export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) { return <p className={cn('text-sm text-slate-500', className)} {...props} />; }
