'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

type TabsContextValue = { value: string; setValue: (value: string) => void };
const TabsContext = React.createContext<TabsContextValue | null>(null);

export function Tabs({ value, defaultValue, onValueChange, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { value?: string; defaultValue?: string; onValueChange?: (value: string) => void }) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? value ?? '');
  const currentValue = value ?? internalValue;
  const setValue = React.useCallback((nextValue: string) => {
    setInternalValue(nextValue);
    onValueChange?.(nextValue);
  }, [onValueChange]);
  return <TabsContext.Provider value={{ value: currentValue, setValue }}><div className={cn('w-full', className)} {...props} /></TabsContext.Provider>;
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('inline-flex h-11 items-center justify-center rounded-2xl bg-slate-100 p-1 text-slate-500', className)} {...props} />;
}

export function TabsTrigger({ value, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const context = React.useContext(TabsContext);
  const isActive = context?.value === value;
  return <button type="button" className={cn('inline-flex items-center justify-center whitespace-nowrap rounded-xl px-3 py-2 text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50', isActive ? 'bg-white text-slate-950 shadow-sm' : 'hover:text-slate-950', className)} onClick={() => context?.setValue(value)} {...props} />;
}

export function TabsContent({ value, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const context = React.useContext(TabsContext);
  if (context?.value !== value) return null;
  return <div className={cn('mt-2', className)} {...props} />;
}
