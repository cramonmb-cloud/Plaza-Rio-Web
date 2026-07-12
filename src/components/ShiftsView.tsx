import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getDb } from '../lib/firebase';
import { UserShift } from '../types';
import { 
  History, 
  Clock, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle, 
  Trash2, 
  Edit3, 
  X, 
  Check, 
  Loader2, 
  DollarSign, 
  FileText,
  Filter,
  Calendar
} from 'lucide-react';

interface ExtendedShift extends UserShift {
  sourceCollection: 'cash_cuts' | 'user_shifts';
}

const isSameDay = (d1: Date, d2: Date) => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

export default function ShiftsView() {
  const [shifts, setShifts] = useState<ExtendedShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filterMode, setFilterMode] = useState<'TODOS' | 'HOY' | 'AYER' | 'FECHA'>('HOY'); // default to Hoy
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Modal / Form state for manual shift close or edit
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<ExtendedShift | null>(null);

  // Edit fields
  const [initialAmount, setInitialAmount] = useState<number>(200);
  const [expectedAmount, setExpectedAmount] = useState<number>(0);
  const [actualAmount, setActualAmount] = useState<number | ''>(''); // money reported by cashier
  const [notes, setNotes] = useState('');
  const [isClosed, setIsClosed] = useState(false);

  // Listen to both collections in real-time
  useEffect(() => {
    const db = getDb();

    // Listen to user_shifts
    const unsubShifts = onSnapshot(collection(db, 'user_shifts'), (snapShifts) => {
      // Listen to cash_cuts
      const unsubCuts = onSnapshot(collection(db, 'cash_cuts'), (snapCuts) => {
        const merged: ExtendedShift[] = [];
        const seenIds = new Set<string>();

        // Process cash_cuts first
        snapCuts.forEach((doc) => {
          const data = doc.data();
          const id = doc.id;
          seenIds.add(id);
          merged.push({
            shiftId: id,
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
            sourceCollection: 'cash_cuts'
          } as ExtendedShift);
        });

        // Process user_shifts second
        snapShifts.forEach((doc) => {
          if (!seenIds.has(doc.id)) {
            const data = doc.data();
            const id = doc.id;
            merged.push({
              shiftId: id,
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
              sourceCollection: 'user_shifts'
            } as ExtendedShift);
          }
        });

        // Sort newest start time first
        merged.sort((a, b) => b.startTime - a.startTime);
        setShifts(merged);
        setLoading(false);
      }, (err) => {
        console.error('Error al suscribirse a cash_cuts:', err);
        setError('Error al sincronizar cortes de caja.');
        setLoading(false);
      });

      return () => {
        unsubCuts();
      };
    }, (err) => {
      console.error('Error al suscribirse a user_shifts:', err);
      setError('Error al sincronizar turnos y cortes.');
      setLoading(false);
    });

    return () => {
      unsubShifts();
    };
  }, []);

  const openEditModal = (shift: ExtendedShift) => {
    setSelectedShift(shift);
    setInitialAmount(shift.initialAmount);
    setExpectedAmount(shift.expectedAmount || 0);
    setActualAmount(shift.actualAmount !== null ? shift.actualAmount : '');
    setNotes(shift.notes || '');
    setIsClosed(shift.isClosed);
    setIsEditModalOpen(true);
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShift) return;

    try {
      const db = getDb();
      const colName = selectedShift.sourceCollection || 'cash_cuts';
      const shiftRef = doc(db, colName, selectedShift.shiftId);

      const actualNum = actualAmount === '' ? null : Number(actualAmount);
      
      // Calculate difference if closed
      let calculatedDiff: number | null = null;
      let endTimeVal = selectedShift.endTime;

      if (isClosed) {
        if (actualNum !== null) {
          calculatedDiff = actualNum - expectedAmount;
        }
        if (!endTimeVal) {
          endTimeVal = Date.now();
        }
      } else {
        endTimeVal = null;
      }

      await updateDoc(shiftRef, {
        initialAmount: Number(initialAmount),
        expectedAmount: Number(expectedAmount),
        actualAmount: actualNum,
        collectedAmount: actualNum,
        difference: calculatedDiff,
        isClosed: isClosed,
        endTime: endTimeVal,
        notes: notes
      });

      setIsEditModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setError(`Error al guardar cambios de corte: ${err.message || err}`);
    }
  };

  const handleDeleteShift = async (shift: ExtendedShift) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el registro de ${shift.sourceCollection === 'cash_cuts' ? 'corte' : 'turno'} ${shift.shiftId}?`)) {
      return;
    }

    try {
      const db = getDb();
      const colName = shift.sourceCollection || 'cash_cuts';
      await deleteDoc(doc(db, colName, shift.shiftId));
    } catch (err: any) {
      console.error(err);
      setError(`Error al eliminar registro: ${err.message || err}`);
    }
  };

  // Filter logic
  const filteredShifts = shifts.filter((shift) => {
    if (filterMode === 'TODOS') return true;

    const shiftDate = new Date(shift.startTime);
    const today = new Date();

    if (filterMode === 'HOY') {
      return isSameDay(shiftDate, today);
    }

    if (filterMode === 'AYER') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return isSameDay(shiftDate, yesterday);
    }

    if (filterMode === 'FECHA') {
      if (!customDate) return true;
      const [year, month, day] = customDate.split('-').map(Number);
      const targetDate = new Date(year, month - 1, day);
      return isSameDay(shiftDate, targetDate);
    }

    return true;
  });

  // Calculate stats for the filtered list
  const totalCutsCount = filteredShifts.length;
  const totalExpectedAmount = filteredShifts.reduce((sum, s) => sum + (s.expectedAmount || 0), 0);
  const totalActualAmount = filteredShifts.reduce((sum, s) => sum + (s.actualAmount || 0), 0);
  const totalDifferenceAmount = filteredShifts.reduce((sum, s) => sum + (s.difference || 0), 0);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <Loader2 size={40} className="animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium">Cargando turnos y cortes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1.5 md:p-3 max-w-7xl mx-auto font-sans text-slate-700">
      {/* View Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <img src="/logo-plaza-1.jpg" alt="Logo" className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-md" onError={(e) => {
            e.currentTarget.style.display = 'none';
          }} />
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Turnos y Cortes de Caja</h1>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm flex items-start gap-3">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Interactive Filters Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-200/60 shadow-md">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 mr-2">
            <Filter size={14} className="text-blue-600" /> Filtrar por:
          </span>
          <button
            onClick={() => setFilterMode('HOY')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterMode === 'HOY'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            Hoy
          </button>
          <button
            onClick={() => setFilterMode('AYER')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterMode === 'AYER'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            Ayer
          </button>
          <button
            onClick={() => setFilterMode('FECHA')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterMode === 'FECHA'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            Seleccionar Fecha
          </button>
          <button
            onClick={() => setFilterMode('TODOS')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterMode === 'TODOS'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            Ver Todos
          </button>
        </div>

        {filterMode === 'FECHA' && (
          <div className="flex items-center gap-2.5 bg-white p-2 rounded-xl border border-slate-200 animate-fade-in shadow-xs">
            <Calendar size={14} className="text-blue-600" />
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="bg-transparent border-none text-slate-900 text-xs font-bold focus:outline-none cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Cortes */}
        <div className="glass-panel border border-slate-200/55 rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Registros</span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">{totalCutsCount}</span>
          </div>
        </div>

        {/* Card 2: Total Esperado */}
        <div className="glass-panel border border-slate-200/55 rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Cobrado (Sist.)</span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">${totalExpectedAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Card 3: Total Entregado */}
        <div className="glass-panel border border-slate-200/55 rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Entregado (Fís.)</span>
            <span className="text-xl font-bold text-emerald-600 mt-1 block">${totalActualAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Card 4: Diferencia Total */}
        <div className="glass-panel border border-slate-200/55 rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Diferencia Total</span>
            <span className={`text-xl font-bold mt-1 block ${totalDifferenceAmount === 0 ? 'text-slate-700' : totalDifferenceAmount < 0 ? 'text-red-500' : 'text-amber-600'}`}>
              {totalDifferenceAmount > 0 ? `+$${totalDifferenceAmount.toFixed(2)}` : totalDifferenceAmount < 0 ? `-$${Math.abs(totalDifferenceAmount).toFixed(2)}` : `$${totalDifferenceAmount.toFixed(2)}`}
            </span>
          </div>
        </div>
      </div>

      {/* Shifts Table */}
      <div className="glass-panel border border-slate-200/60 rounded-2xl shadow-md overflow-hidden">
        {loading ? (
          <div className="py-24 text-center">
            <Loader2 size={36} className="animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">Cargando cortes y turnos...</p>
          </div>
        ) : filteredShifts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider bg-slate-50/50">
                  <th className="py-4 px-6 font-mono">ID Registro</th>
                  <th className="py-4 px-6 text-center">Tipo</th>
                  <th className="py-4 px-6">Empleado</th>
                  <th className="py-4 px-6">Inicio / Fin</th>
                  <th className="py-4 px-6">Apertura</th>
                  <th className="py-4 px-6">Cobrado (Sist.)</th>
                  <th className="py-4 px-6">Entregado (Fís.)</th>
                  <th className="py-4 px-6">Diferencia</th>
                  <th className="py-4 px-6 text-center">Estado</th>
                  <th className="py-4 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredShifts.map((shift) => {
                  const startDate = new Date(shift.startTime);
                  const endDate = shift.endTime ? new Date(shift.endTime) : null;
                  
                  // Difference alerts
                  const hasDiscrepancy = shift.difference !== null && shift.difference !== 0;
                  const isNegativeDiscrepancy = shift.difference !== null && shift.difference < 0;

                  return (
                    <tr key={shift.shiftId} className="hover:bg-slate-50 text-xs text-slate-700">
                      <td className="py-4 px-6 font-mono font-bold text-blue-600">{shift.shiftId}</td>
                      <td className="py-4 px-6 text-center">
                        {shift.sourceCollection === 'cash_cuts' ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold tracking-wider uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            Corte
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold tracking-wider uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            Turno
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-900">@{shift.username}</td>
                      <td className="py-4 px-6 text-slate-500">
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1">
                            <Clock size={11} className="text-emerald-500" />
                            {startDate.toLocaleDateString('es-MX')} {startDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {endDate ? (
                            <span className="flex items-center gap-1 mt-0.5 text-slate-400">
                              <CheckCircle size={11} className="text-slate-400" />
                              {endDate.toLocaleDateString('es-MX')} {endDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 mt-0.5 text-amber-600 font-semibold italic">
                              <Clock size={11} className="animate-spin text-amber-500" />
                              Activo / En curso
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono">${shift.initialAmount.toFixed(2)}</td>
                      <td className="py-4 px-6 font-mono text-slate-600">
                        ${(shift.expectedAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-4 px-6 font-mono font-semibold text-slate-900">
                        {shift.actualAmount !== null ? `$${shift.actualAmount.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-4 px-6">
                        {shift.difference !== null ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold border
                            ${shift.difference === 0 
                              ? 'text-emerald-600 bg-emerald-50 border-emerald-100' 
                              : isNegativeDiscrepancy 
                                ? 'text-red-500 bg-rose-50 border-rose-100 font-extrabold animate-pulse' 
                                : 'text-amber-600 bg-amber-50 border-amber-100'}`}>
                            {shift.difference > 0 ? `+$${shift.difference.toFixed(2)}` : `-$${Math.abs(shift.difference).toFixed(2)}`}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {shift.isClosed ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                            Cerrado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-100">
                            Abierto
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(shift)}
                            className="p-1.5 bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white rounded-lg transition-all cursor-pointer"
                            title={shift.isClosed ? "Editar Observaciones / Monto" : "Hacer Corte de Caja Manual"}
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteShift(shift)}
                            className="p-1.5 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white rounded-lg transition-all cursor-pointer"
                            title="Eliminar registro"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-24 text-center text-slate-400 font-medium">
            <History size={32} className="mx-auto text-slate-300 mb-2" />
            <span className="font-semibold text-slate-500">Sin cortes de caja en esta fecha</span>
            <p className="text-xs mt-1">Modifica los filtros o selecciona otra fecha para consultar los registros.</p>
          </div>
        )}
      </div>

      {/* MODAL: EDIT SHIFT / CLOSING ARQUEO */}
      {isEditModalOpen && selectedShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-xs">
          <div className="glass-panel border border-slate-200/80 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <History size={20} className="text-blue-600" />
              Arqueo de Turno: {selectedShift.shiftId}
            </h3>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-4 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Colección Origen:</span>
                <span className="font-bold text-slate-900 capitalize">{selectedShift.sourceCollection === 'cash_cuts' ? 'Cortes (Android)' : 'Turnos'}</span>
              </div>
              <div className="flex justify-between">
                <span>Empleado:</span>
                <span className="font-bold text-slate-900">@{selectedShift.username}</span>
              </div>
              <div className="flex justify-between">
                <span>Fecha Inicio:</span>
                <span>{new Date(selectedShift.startTime).toLocaleString('es-MX')}</span>
              </div>
              <div className="flex justify-between">
                <span>Cobro Registrado por Sistema:</span>
                <span className="font-bold text-emerald-600 font-mono">${expectedAmount.toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handleSaveShift} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Fondo Apertura ($)
                  </label>
                  <input
                    type="number"
                    required
                    value={initialAmount}
                    onChange={(e) => setInitialAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-950 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Cobros Esperados ($)
                  </label>
                  <input
                    type="number"
                    required
                    value={expectedAmount}
                    onChange={(e) => setExpectedAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-950 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Monto Físico Entregado ($)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <DollarSign size={16} />
                  </span>
                  <input
                    type="number"
                    placeholder="Monto entregado físicamente..."
                    value={actualAmount}
                    onChange={(e) => setActualAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-950 font-bold text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* isClosed toggle */}
              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="shift-is-closed-checkbox"
                  checked={isClosed}
                  onChange={(e) => setIsClosed(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-white border-slate-200 rounded focus:ring-blue-500"
                />
                <label htmlFor="shift-is-closed-checkbox" className="text-xs font-semibold text-slate-700">
                  Cerrar turno definitivamente
                </label>
              </div>

              {/* Difference Preview */}
              {isClosed && actualAmount !== '' && (
                <div className="p-3.5 bg-slate-50 rounded-xl flex items-center justify-between text-xs font-semibold border border-slate-200">
                  <span className="text-slate-500">Diferencia calculada:</span>
                  <span className={`font-mono text-sm font-bold
                    ${(Number(actualAmount) - expectedAmount) === 0 
                      ? 'text-emerald-600' 
                      : (Number(actualAmount) - expectedAmount) < 0 
                        ? 'text-red-600' 
                        : 'text-amber-600'}`}>
                    ${(Number(actualAmount) - expectedAmount).toFixed(2)}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Observaciones / Notas
                </label>
                <textarea
                  placeholder="ej. Todo cuadra, faltaron $10 pesos por cambio, etc..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-950 text-xs focus:outline-none h-16 resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-medium text-slate-700 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-semibold text-white transition-all shadow-md shadow-blue-600/10 cursor-pointer"
                >
                  Guardar Corte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
