import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  DollarSign, 
  Users, 
  History, 
  CreditCard, 
  Printer, 
  LogOut, 
  Database,
  Menu,
  X,
  User as UserIcon,
  ShieldAlert,
  BarChart3
} from 'lucide-react';
import { User } from '../types';
import { getPreferredDbId, setPreferredDbId } from '../lib/firebase';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentUser: User;
  onLogout: () => void;
}

export default function Sidebar({ activeTab, onTabChange, currentUser, onLogout }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dbId, setDbId] = useState(getPreferredDbId());
  const [isEditingDb, setIsEditingDb] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Vista General', icon: LayoutDashboard },
    { id: 'records', label: 'Registros y Tickets', icon: FileSpreadsheet },
    { id: 'rates', label: 'Tarifas por Vehículo', icon: DollarSign },
    { id: 'users', label: 'Empleados y Usuarios', icon: Users },
    { id: 'shifts', label: 'Turnos y Cortes', icon: History },
    { id: 'prepaid', label: 'Pensionados / Mensuales', icon: CreditCard },
    { id: 'reports', label: 'Reportes y Descargas', icon: BarChart3 },
  ];
  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between bg-white/80 border-b border-slate-200/50 text-slate-900 px-5 py-4 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <img src="/logo-plaza-1.jpg" alt="Logo" className="w-9 h-9 rounded-lg object-cover border border-slate-200 shadow-sm" onError={(e) => {
            e.currentTarget.style.display = 'none';
          }} />
          <span className="font-bold tracking-tight text-md text-slate-900">Plaza del Río</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-slate-100 rounded-xl transition-all cursor-pointer text-slate-600"
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Sidebar Overlay for Mobile */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/25 z-40 backdrop-blur-xs"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed inset-y-0 left-0 glass-panel border-r border-slate-200/60 text-slate-700 w-72 lg:w-80 flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 lg:static
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Banner */}
        <div className="p-6 border-b border-slate-100/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-plaza-1.jpg" alt="Logo" className="w-11 h-11 rounded-xl object-cover border border-slate-200 shadow-sm" onError={(e) => {
              e.currentTarget.style.display = 'none';
            }} />
            <div>
              <h2 className="font-extrabold text-slate-900 text-lg tracking-tight">Plaza del Río</h2>
              <span className="text-xs text-blue-600 font-semibold tracking-wider uppercase">Control de Estacionamiento</span>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* User profile info */}
        <div className="p-4 mx-4 my-4 bg-slate-50/60 border border-slate-100 rounded-2xl flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl">
            <UserIcon size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 truncate">{currentUser.fullName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                {currentUser.role}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">@{currentUser.username}</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Cerrar Sesión"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer shrink-0"
          >
            <LogOut size={18} />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto scrollbar-thin">
          <span className="block px-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">
            Módulos de Gestión
          </span>
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all cursor-pointer group
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }
                `}
              >
                <IconComponent 
                  size={18} 
                  className={`transition-transform duration-200 group-hover:scale-105 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-800'}`} 
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
