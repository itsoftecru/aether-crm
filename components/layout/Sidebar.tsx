'use client';
import React from 'react';
import { ClipboardList, FileText, FolderOpen, Home, LayoutDashboard, Settings, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export type ActiveSection = 'home' | 'clients' | 'deals' | 'drawings' | 'files' | 'settings';
export type NavigationItem = { id: ActiveSection; title: string; icon: React.ComponentType<{ className?: string }> };
export const NAVIGATION_ITEMS: NavigationItem[] = [
  { id: 'home', title: 'Главная', icon: Home }, { id: 'clients', title: 'Клиенты', icon: UsersRound }, { id: 'deals', title: 'Сделки', icon: ClipboardList }, { id: 'drawings', title: 'Чертежи', icon: FileText }, { id: 'files', title: 'Файлы', icon: FolderOpen }, { id: 'settings', title: 'Настройки', icon: Settings },
];
export function Sidebar({ activeSection, onSectionChange }: { activeSection: ActiveSection; onSectionChange: (section: ActiveSection) => void }) {
  return <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white px-5 py-6 shadow-sm lg:block"><div className="mb-10 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white"><LayoutDashboard className="h-5 w-5" /></div><div><p className="text-lg font-bold">AetherCRM</p><p className="text-sm text-slate-500">Проектные заказы</p></div></div><ScrollArea className="max-h-[calc(100vh-160px)] pr-1"><nav className="space-y-2" aria-label="Основная навигация">{NAVIGATION_ITEMS.map((item) => { const Icon = item.icon; const isActive = item.id === activeSection; return <Button key={item.id} variant={isActive ? 'default' : 'ghost'} onClick={() => onSectionChange(item.id)} className={`w-full justify-start px-4 py-3 ${isActive ? 'bg-[#2563EB] shadow-lg shadow-blue-700/15' : ''}`}><Icon className="h-5 w-5" />{item.title}</Button>; })}</nav></ScrollArea></aside>;
}
