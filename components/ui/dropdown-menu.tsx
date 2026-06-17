'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

type MenuContextValue = { open: boolean; setOpen: (open: boolean) => void };
const MenuContext = React.createContext<MenuContextValue | null>(null);

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return <MenuContext.Provider value={{ open, setOpen }}><div className="relative inline-block">{children}</div></MenuContext.Provider>;
}
export function DropdownMenuTrigger({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = React.useContext(MenuContext);
  return <button type="button" className={className} onClick={() => context?.setOpen(!context.open)} {...props} />;
}
export function DropdownMenuContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const context = React.useContext(MenuContext);
  if (!context?.open) return null;
  return <div className={cn('absolute right-0 z-50 mt-2 min-w-44 rounded-2xl border border-slate-200 bg-white p-1 text-slate-950 shadow-xl', className)} {...props} />;
}
export function DropdownMenuItem({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={cn('flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950', className)} {...props} />;
}
