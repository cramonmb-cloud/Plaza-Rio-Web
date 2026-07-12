import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { getDb } from '../lib/firebase';
import { ParkingRecord, UserShift, VehicleTypeRate } from '../types';
import { 
  Car, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Clock, 
  PieChart as PieIcon, 
  CreditCard,
  CheckCircle,
  Loader2,
  Database
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import DemoSeeder from './DemoSeeder';

export default function DashboardView() {
  const [records, setRecords] = useState<ParkingRecord[]>([]);
  const [userShifts, setUserShifts] = useState<UserShift[]>([]);
  const [cashCuts, setCashCuts] = useState<UserShift[]>([]);
  const [rates, setRates] = useState<VehicleTypeRate[]>([]);
  const [loading, setLoading] = useState(true);

  // Load rates
  useEffect(() => {
    const db = getDb();
    const unsub = onSnapshot(collection(db, 'vehicle_type_rates'), (snap) => {
      const list: VehicleTypeRate[] = [];
      snap.forEach((doc) => {
        list.push({ typeName: doc.id, ...doc.data() } as VehicleTypeRate);
      });
      setRates(list);
    }, (error) => {
      console.error('Error fetching rates:', error);
    });
    return unsub;
  }, []);

  // Listen to parking records in real-time
  useEffect(() => {
    const db = getDb();
    const unsub = onSnapshot(collection(db, 'parking_records'), (snap) => {
      const list: ParkingRecord[] = [];
      snap.forEach((doc) => {
        list.push({ ticketCode: doc.id, ...doc.data() } as ParkingRecord);
      });
      setRecords(list);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to parking records:', error);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Listen to user_shifts in real-time
  useEffect(() => {
    const db = getDb();
    const unsub = onSnapshot(collection(db, 'user_shifts'), (snap) => {
      const list: UserShift[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        list.push({
          shiftId: doc.id,
          username: data.username || 'unknown',
          startTime: data.startTime || 0,
          endTime: data.endTime || null,
          initialAmount: data.initialAmount !== undefined ? data.initialAmount : 200,
          expectedAmount: data.expectedAmount || 0,
          actualAmount: data.actualAmount !== undefined ? data.actualAmount : null,
          collectedAmount: data.collectedAmount !== undefined ? data.collectedAmount : data.actualAmount,
          difference: data.difference !== undefined ? data.difference : null,
          isClosed: data.isClosed !== undefined ? data.isClosed : (data.endTime ? true : false),
          notes: data.notes || '',
        } as UserShift);
      });
      setUserShifts(list);
    }, (error) => {
      console.error('Error listening to user_shifts:', error);
    });
    return unsub;
  }, []);

  // Listen to cash_cuts in real-time
  useEffect(() => {
    const db = getDb();
    const unsub = onSnapshot(collection(db, 'cash_cuts'), (snap) => {
      const list: UserShift[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        list.push({
          shiftId: doc.id,
          username: data.username || 'unknown',
          startTime: data.startTime || 0,
          endTime: data.endTime || null,
          initialAmount: data.initialAmount !== undefined ? data.initialAmount : 200,
          expectedAmount: data.expectedAmount || 0,
          actualAmount: data.actualAmount !== undefined ? data.actualAmount : null,
          collectedAmount: data.collectedAmount !== undefined ? data.collectedAmount : data.actualAmount,
          difference: data.difference !== undefined ? data.difference : null,
          isClosed: data.isClosed !== undefined ? data.isClosed : (data.endTime ? true : false),
          notes: data.notes || '',
        } as UserShift);
      });
      setCashCuts(list);
    }, (error) => {
      console.error('Error listening to cash_cuts:', error);
    });
    return unsub;
  }, []);

  // Merge shifts and cuts in useMemo
  const shifts = React.useMemo(() => {
    const merged: UserShift[] = [...cashCuts];
    const seenIds = new Set<string>(cashCuts.map(c => c.shiftId));
    userShifts.forEach(s => {
      if (!seenIds.has(s.shiftId)) {
        merged.push(s);
      }
    });
    return merged;
  }, [userShifts, cashCuts]);

  // Calculations
  const activeRecords = records.filter(r => r.status === 'ACTIVE');
  const activeCount = activeRecords.length;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayMs = startOfToday.getTime();

  const completedToday = records.filter(r => 
    r.status === 'COMPLETED' && 
    r.exitTime !== null && 
    r.exitTime >= startOfTodayMs
  );

  const earningsToday = completedToday.reduce((sum, r) => sum + (r.amountPaid || 0), 0);

  // Smart calculation for Active Employees:
  // 1. Employees who have an explicitly open shift in shifts state
  // 2. PLUS employees who have registered/processed a ticket within the last 12 hours and do not have a closed shift after that
  const activeEmployees = React.useMemo(() => {
    const activeSet = new Set<string>();
    
    // Check open shifts
    shifts.forEach(s => {
      if (!s.isClosed && s.username) {
        activeSet.add(s.username);
      }
    });

    // Check recent ticket activity (last 12 hours)
    const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
    records.forEach(r => {
      if (r.entryTime && r.entryTime >= twelveHoursAgo) {
        if (r.registeredBy) {
          const hasClosedShiftAfter = shifts.some(s => s.username === r.registeredBy && s.isClosed && s.endTime && s.endTime > r.entryTime);
          if (!hasClosedShiftAfter) {
            activeSet.add(r.registeredBy);
          }
        }
      }
      if (r.exitTime && r.exitTime >= twelveHoursAgo) {
        if (r.processedBy) {
          const hasClosedShiftAfter = shifts.some(s => s.username === r.processedBy && s.isClosed && s.endTime && s.endTime > r.exitTime);
          if (!hasClosedShiftAfter) {
            activeSet.add(r.processedBy);
          }
        }
      }
    });

    return Array.from(activeSet);
  }, [shifts, records]);

  // Chart data: Distribution by Vehicle Type
  const vehicleTypeCounts: { [key: string]: number } = {};
  records.forEach(r => {
    const type = r.vehicleType || 'Auto';
    vehicleTypeCounts[type] = (vehicleTypeCounts[type] || 0) + 1;
  });

  const pieData = Object.entries(vehicleTypeCounts).map(([name, value]) => ({
    name,
    value,
  }));

  // Chart data: Hourly Flow (last 24 hours)
  const hourlyDataMap: { [key: string]: { hourLabel: string; autos: number; ingresos: number } } = {};
  // Initialize last 12 hours
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setHours(d.getHours() - i);
    const hourKey = d.getHours().toString().padStart(2, '0');
    hourlyDataMap[hourKey] = {
      hourLabel: `${hourKey}:00`,
      autos: 0,
      ingresos: 0,
    };
  }

  // Populate data
  records.forEach(r => {
    const entryDate = new Date(r.entryTime);
    const exitDate = r.exitTime ? new Date(r.exitTime) : null;
    
    // Auto entered hour
    const entryHourKey = entryDate.getHours().toString().padStart(2, '0');
    if (hourlyDataMap[entryHourKey]) {
      hourlyDataMap[entryHourKey].autos += 1;
    }

    // Auto exited / collected hour
    if (exitDate && r.amountPaid) {
      const exitHourKey = exitDate.getHours().toString().padStart(2, '0');
      if (hourlyDataMap[exitHourKey]) {
        hourlyDataMap[exitHourKey].ingresos += r.amountPaid;
      }
    }
  });

  // Convert map to sorted array
  const hourlyChartData = Object.values(hourlyDataMap);

  // Chart data: Preferred Payment Methods
  let cashCount = 0;
  let cardCount = 0;
  completedToday.forEach(r => {
    if (r.paymentMethod === 'Efectivo') cashCount++;
    if (r.paymentMethod === 'Tarjeta') cardCount++;
  });

  const paymentData = [
    { name: 'Efectivo', cantidad: cashCount, monto: completedToday.filter(r => r.paymentMethod === 'Efectivo').reduce((s, r) => s + (r.amountPaid || 0), 0) },
    { name: 'Tarjeta', cantidad: cardCount, monto: completedToday.filter(r => r.paymentMethod === 'Tarjeta').reduce((s, r) => s + (r.amountPaid || 0), 0) }
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <Loader2 size={40} className="animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium">Sincronizando panel con Firestore...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-1.5 md:p-3 max-w-7xl mx-auto">
      {/* Header and Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <img src="/logo-plaza-1.jpg" alt="Logo" className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-md" onError={(e) => {
            e.currentTarget.style.display = 'none';
          }} />
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Panel de Control</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-2xl text-xs text-emerald-600 font-semibold w-fit shadow-sm">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
          Sincronizado con Android
        </div>
      </div>

      {/* Demo Seeder (Only shown if records are empty) */}
      {records.length === 0 && (
        <DemoSeeder />
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI 1: Active Vehicles */}
        <div className="glass-panel rounded-2xl p-6 shadow-md relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Autos Estacionados</span>
              <h3 className="text-3xl font-extrabold text-slate-900">{activeCount}</h3>
              <p className="text-[11px] text-blue-600 font-medium">Vehículos activos en el recinto</p>
            </div>
          </div>
        </div>

        {/* KPI 2: Today's Revenue */}
        <div className="glass-panel rounded-2xl p-6 shadow-md relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Ingresos de Hoy</span>
              <h3 className="text-3xl font-extrabold text-emerald-600">${earningsToday.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Suma de <span className="font-bold text-slate-700">{completedToday.length}</span> tickets pagados hoy
              </p>
            </div>
          </div>
        </div>

        {/* KPI 3: Active Employees */}
        <div className="glass-panel rounded-2xl p-6 shadow-md relative overflow-hidden group hover:border-purple-500/30 transition-all duration-300">
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Empleados Activos</span>
              <h3 className="text-3xl font-extrabold text-slate-900">{activeEmployees.length}</h3>
              {activeEmployees.length > 0 ? (
                <p className="text-[11px] text-purple-600 font-medium truncate max-w-[200px]" title={activeEmployees.map(u => `@${u}`).join(', ')}>
                  Activos: {activeEmployees.map(u => `@${u}`).join(', ')}
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 font-medium">Ningún turno activo</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart: Hourly Activity */}
        <div className="glass-panel rounded-2xl p-6 shadow-md lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="font-bold text-slate-900 text-md">Flujo e Ingresos por Hora (Hoy)</h4>
              <p className="text-xs text-slate-500 mt-1">Gráfico acumulado de ingresos y afluencia por franja horaria</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1 text-blue-600 font-medium">
                <span className="w-2.5 h-2.5 bg-blue-500 rounded-sm" />
                Ingresos ($)
              </span>
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" />
                Autos Entrados
              </span>
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAutos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
                <XAxis 
                  dataKey="hourLabel" 
                  stroke="#64748b" 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderColor: '#e2e8f0', 
                    borderRadius: '12px',
                    color: '#0f172a',
                    fontSize: '12px'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="ingresos" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorIngresos)" 
                  name="Ingresos ($)"
                />
                <Area 
                  type="monotone" 
                  dataKey="autos" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorAutos)" 
                  name="Autos Entrados"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Vehicle Distribution */}
        <div className="glass-panel rounded-2xl p-6 shadow-md flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-900 text-md">Distribución por Vehículo</h4>
            <p className="text-xs text-slate-500 mt-1">Porcentaje y conteo de vehículos registrados en total</p>
          </div>

          <div className="h-56 relative flex items-center justify-center my-4">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      borderColor: '#e2e8f0', 
                      borderRadius: '12px',
                      color: '#0f172a',
                      fontSize: '12px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-500 font-medium">No hay vehículos registrados</div>
            )}
            <div className="absolute text-center">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">Registros</span>
              <span className="text-2xl font-black text-slate-900">{records.length}</span>
            </div>
          </div>

          <div className="space-y-2">
            {pieData.map((item, index) => {
              const percentage = records.length > 0 ? Math.round((item.value / records.length) * 100) : 0;
              return (
                <div key={item.name} className="flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span>{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="text-slate-900 font-semibold">{item.value}</span>
                    <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-mono">({percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Second Row: Payment Methods & Active Tickets list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Methods Breakdown */}
        <div className="glass-panel rounded-2xl p-6 shadow-md">
          <h4 className="font-bold text-slate-900 text-md mb-2">Métodos de Pago Utilizados (Hoy)</h4>
          <p className="text-xs text-slate-500 mb-6">Preferencia de Efectivo vs. Tarjeta en ingresos de hoy</p>
 
          <div className="h-52 my-4">
            {cashCount + cardCount > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.3} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      borderColor: '#e2e8f0', 
                      borderRadius: '12px',
                      color: '#0f172a',
                      fontSize: '12px'
                    }} 
                  />
                  <Bar dataKey="monto" fill="#10b981" radius={[8, 8, 0, 0]} name="Ingreso total ($)">
                    <Cell fill="#10b981" />
                    <Cell fill="#6366f1" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 font-medium">
                Sin cobros registrados el día de hoy
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Efectivo</span>
              <span className="block text-lg font-bold text-emerald-600 mt-1">${paymentData[0].monto.toFixed(2)}</span>
              <span className="text-[10px] text-slate-500">{paymentData[0].cantidad} tickets</span>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Tarjeta</span>
              <span className="block text-lg font-bold text-indigo-600 mt-1">${paymentData[1].monto.toFixed(2)}</span>
              <span className="text-[10px] text-slate-500">{paymentData[1].cantidad} tickets</span>
            </div>
          </div>
        </div>

        {/* Active tickets summary */}
        <div className="glass-panel rounded-2xl p-6 shadow-md lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-slate-900 text-md">Vehículos Activos Recientes</h4>
              <p className="text-xs text-slate-500 mt-1">Últimos vehículos ingresados que siguen en el estacionamiento</p>
            </div>
            <span className="text-xs bg-blue-50 text-blue-600 font-semibold px-3 py-1 rounded-full border border-blue-100">
              {activeCount} total
            </span>
          </div>

          <div className="overflow-x-auto">
            {activeRecords.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="py-3 px-2">Ticket</th>
                    <th className="py-3 px-2">Placa</th>
                    <th className="py-3 px-2">Tipo</th>
                    <th className="py-3 px-2">Hora Entrada</th>
                    <th className="py-3 px-2 text-right">Duración</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRecords.slice(0, 5).map((rec) => {
                    const elapsedMin = Math.max(0, Math.floor((Date.now() - rec.entryTime) / 60000));
                    const hours = Math.floor(elapsedMin / 60);
                    const mins = elapsedMin % 60;
                    const elapsedStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

                    return (
                      <tr key={rec.ticketCode} className="border-b border-slate-100/60 hover:bg-slate-50 text-xs text-slate-700">
                        <td className="py-3 px-2 font-mono font-bold text-blue-600">{rec.ticketCode}</td>
                        <td className="py-3 px-2">
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 font-mono rounded font-semibold text-[11px]">
                            {rec.plate}
                          </span>
                        </td>
                        <td className="py-3 px-2">{rec.vehicleType}</td>
                        <td className="py-3 px-2 text-slate-500">
                          {new Date(rec.entryTime).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-2 text-right font-mono font-semibold text-amber-600">{elapsedStr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400 font-medium">
                No hay vehículos activos en el estacionamiento en este momento.
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
              <Clock size={12} />
              Última actualización: {new Date().toLocaleTimeString('es-MX')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
