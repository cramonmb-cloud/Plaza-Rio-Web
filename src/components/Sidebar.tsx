import React, { useState, useEffect, useRef } from 'react';
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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, targetX: -1000, targetY: -1000, active: false });

  // Interactive River Wave Animation for Sidebar Banner
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let rect = canvas.getBoundingClientRect();
    let width = (canvas.width = rect.width);
    let height = (canvas.height = rect.height);

    const handleResize = () => {
      if (!canvas) return;
      rect = canvas.getBoundingClientRect();
      width = canvas.width = rect.width;
      height = canvas.height = rect.height;
    };
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      const cRect = canvas.getBoundingClientRect();
      mouseRef.current.targetX = e.clientX - cRect.left;
      mouseRef.current.targetY = e.clientY - cRect.top;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    // Track mouse on the parent container (which is parent node)
    const parent = canvas.parentElement;
    if (parent) {
      parent.addEventListener('mousemove', handleMouseMove);
      parent.addEventListener('mouseleave', handleMouseLeave);
    }

    // Dynamic wave parameters
    const riverY = height * 0.45; // Mid-height of banner
    const riverHeight = height * 0.5;
    
    // Foam / Bubble particles
    const particles: Array<{ x: number; y: number; speed: number; size: number; alpha: number }> = [];
    for (let i = 0; i < 22; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * riverHeight,
        speed: 1.2 + Math.random() * 2.0, // flow right
        size: 0.6 + Math.random() * 1.8,
        alpha: 0.15 + Math.random() * 0.35,
      });
    }

    const splashes: Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string }> = [];

    const waves = [
      {
        yOffset: -12,
        length: 0.015,
        amplitude: 5,
        speed: 0.05,
        color: 'rgba(56, 189, 248, 0.15)', // light cyan
      },
      {
        yOffset: 0,
        length: 0.01,
        amplitude: 8,
        speed: 0.035,
        color: 'rgba(14, 165, 233, 0.22)', // sky blue
      },
      {
        yOffset: 12,
        length: 0.012,
        amplitude: 6,
        speed: 0.058,
        color: 'rgba(2, 132, 199, 0.28)', // cobalt blue
      }
    ];

    let t = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.08;
      mouse.y += (mouse.targetY - mouse.y) * 0.08;

      t += 0.55;

      // Draw soft gradient background
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.0)');
      grad.addColorStop(0.3, 'rgba(56, 189, 248, 0.05)');
      grad.addColorStop(0.6, 'rgba(14, 165, 233, 0.12)');
      grad.addColorStop(0.9, 'rgba(2, 132, 199, 0.04)');
      grad.addColorStop(1, 'rgba(3, 105, 161, 0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Spawn splashes
      if (mouse.active && Math.abs(mouse.y - riverY) < 45) {
        if (Math.random() < 0.3) {
          splashes.push({
            x: mouse.x,
            y: mouse.y - riverY,
            vx: 1.0 + Math.random() * 1.5,
            vy: (Math.random() - 0.5) * 0.4,
            size: 0.8 + Math.random() * 1.6,
            alpha: 1.0,
            color: Math.random() > 0.4 ? '#e0f2fe' : '#38bdf8',
          });
        }
      }

      // Draw waves
      waves.forEach((wave) => {
        ctx.beginPath();
        const topPoints: Array<{ x: number; y: number }> = [];
        for (let x = 0; x <= width; x += 6) {
          let yVal = Math.sin(x * wave.length + t * wave.speed) * wave.amplitude;
          yVal += Math.cos(x * (wave.length * 2.2) - t * (wave.speed * 0.6)) * (wave.amplitude * 0.3);

          if (mouse.active) {
            const dx = x - mouse.x;
            const waveY = riverY + wave.yOffset + yVal;
            const dy = waveY - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 70) {
              const force = (70 - dist) / 70;
              yVal += force * 8;
            }
          }

          topPoints.push({ x, y: riverY + wave.yOffset + yVal });
        }

        ctx.moveTo(topPoints[0].x, topPoints[0].y);
        for (let i = 1; i < topPoints.length; i++) {
          ctx.lineTo(topPoints[i].x, topPoints[i].y);
        }
        for (let i = topPoints.length - 1; i >= 0; i--) {
          const pt = topPoints[i];
          ctx.lineTo(pt.x, pt.y + 22);
        }
        ctx.closePath();
        ctx.fillStyle = wave.color;
        ctx.fill();
      });

      // Update and draw foam/bubbles
      particles.forEach((p) => {
        p.x += p.speed;
        if (mouse.active) {
          const dx = p.x - mouse.x;
          const py = riverY + p.y * 0.2;
          const dy = py - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 50) {
            const force = (50 - dist) / 50;
            p.x += (dx / dist) * 1.5 * force;
          }
        }
        if (p.x > width + 5) {
          p.x = -10;
          p.y = Math.random() * riverHeight;
        }
        const py = riverY + p.y * 0.2;
        ctx.beginPath();
        ctx.arc(p.x, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.fill();
      });

      // Draw splashes
      ctx.save();
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.x += s.vx;
        s.y += s.vy;
        s.alpha -= 0.02;
        if (s.alpha <= 0 || s.x > width + 5) {
          splashes.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(s.x, riverY + s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = s.color;
        ctx.globalAlpha = s.alpha;
        ctx.fill();
      }
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (parent) {
        parent.removeEventListener('mousemove', handleMouseMove);
        parent.removeEventListener('mouseleave', handleMouseLeave);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

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
        <div className="p-6 border-b border-slate-100/80 flex items-center justify-between relative overflow-hidden h-24 shrink-0">
          <canvas 
            ref={canvasRef} 
            className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none opacity-80"
          />
          <div className="flex items-center gap-3 relative z-10">
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
            className="lg:hidden p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer relative z-10"
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
