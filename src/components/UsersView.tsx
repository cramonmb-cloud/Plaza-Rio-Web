import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { getDb, sha256 } from '../lib/firebase';
import { User } from '../types';
import { 
  Users, 
  Plus, 
  Edit2, 
  Key, 
  UserCheck, 
  UserX, 
  AlertTriangle, 
  X, 
  Check, 
  Shield, 
  Loader2,
  Lock
} from 'lucide-react';

interface UsersViewProps {
  currentUser: User;
}

export default function UsersView({ currentUser }: UsersViewProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);

  // Form inputs (Create/Edit)
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'EMPLOYEE'>('EMPLOYEE');
  const [isActive, setIsActive] = useState(true);

  // Password Update inputs
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Listen to users collection
  useEffect(() => {
    const db = getDb();
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const list: User[] = [];
      snap.forEach((doc) => {
        list.push({ username: doc.id, ...doc.data() } as User);
      });
      setUsers(list);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError('Error al cargar la colección de usuarios.');
      setLoading(false);
    });

    return unsub;
  }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setUsername('');
    setFullName('');
    setPassword('');
    setRole('EMPLOYEE');
    setIsActive(true);
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setUsername(user.username);
    setFullName(user.fullName);
    setRole(user.role);
    setIsActive(user.isActive);
    setError(null);
    setIsModalOpen(true);
  };

  const openPasswordModal = (user: User) => {
    setPasswordUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setIsPasswordModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase();
    const cleanFullName = fullName.trim();

    if (!cleanUsername) {
      setError('El nombre de usuario es obligatorio.');
      return;
    }
    if (!cleanFullName) {
      setError('El nombre completo es obligatorio.');
      return;
    }

    // Creating new user
    if (!editingUser) {
      if (!password) {
        setError('La contraseña es obligatoria para nuevos usuarios.');
        return;
      }
      if (password.length < 4) {
        setError('La contraseña debe tener al menos 4 caracteres.');
        return;
      }

      // Check if user already exists
      const exists = users.some(u => u.username === cleanUsername);
      if (exists) {
        setError('El nombre de usuario ya está registrado.');
        return;
      }
    }

    try {
      const db = getDb();
      const userRef = doc(db, 'users', cleanUsername);

      if (editingUser) {
        // Edit flow
        // Self protection
        if (editingUser.username === currentUser.username && role !== 'ADMIN') {
          setError('No puedes quitarte el rol de Administrador a ti mismo.');
          return;
        }
        if (editingUser.username === currentUser.username && !isActive) {
          setError('No puedes desactivar tu propia cuenta de Administrador.');
          return;
        }

        await updateDoc(userRef, {
          fullName: cleanFullName,
          role: role,
          isActive: isActive
        });

        showSuccess('Usuario actualizado correctamente.');
      } else {
        // Create flow
        const hash = await sha256(password);
        const newUser: User = {
          username: cleanUsername,
          fullName: cleanFullName,
          passwordHash: hash,
          role: role,
          isActive: isActive
        };

        await setDoc(userRef, newUser);
        showSuccess('Usuario creado correctamente.');
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setError(`Error al guardar: ${err.message || err}`);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!passwordUser) return;
    if (newPassword.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    try {
      const db = getDb();
      const userRef = doc(db, 'users', passwordUser.username);
      const hash = await sha256(newPassword);

      await updateDoc(userRef, {
        passwordHash: hash
      });

      setIsPasswordModalOpen(false);
      showSuccess(`Contraseña de @${passwordUser.username} actualizada con éxito.`);
    } catch (err: any) {
      console.error(err);
      setError(`Error al actualizar contraseña: ${err.message || err}`);
    }
  };

  const handleToggleActive = async (user: User) => {
    setError(null);
    if (user.username === currentUser.username) {
      setError('No puedes desactivar tu propia cuenta de Administrador.');
      return;
    }

    try {
      const db = getDb();
      const userRef = doc(db, 'users', user.username);
      await updateDoc(userRef, {
        isActive: !user.isActive
      });

      showSuccess(`Usuario ${user.username} ${!user.isActive ? 'activado' : 'desactivado'} con éxito.`);
    } catch (err: any) {
      console.error(err);
      setError(`Error al cambiar estado: ${err.message || err}`);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  return (
    <div className="space-y-6 p-1.5 md:p-3 max-w-7xl mx-auto font-sans text-slate-700">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <img src="/logo-plaza-1.jpg" alt="Logo" className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-md" onError={(e) => {
            e.currentTarget.style.display = 'none';
          }} />
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Empleados y Usuarios</h1>
          </div>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/10 active:scale-95 transition-all self-start cursor-pointer animate-fade-in"
        >
          <Plus size={16} />
          Registrar Nuevo Empleado/Admin
        </button>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 text-sm flex items-center gap-3">
          <Check size={18} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm flex items-start gap-3">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="glass-panel rounded-2xl shadow-md overflow-hidden border border-slate-200/60">
        {loading ? (
          <div className="py-24 text-center">
            <Loader2 size={36} className="animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">Cargando usuarios...</p>
          </div>
        ) : users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 text-slate-500 text-xs font-bold uppercase tracking-wider bg-slate-50/50">
                  <th className="py-4 px-6">Nombre Completo</th>
                  <th className="py-4 px-6 font-mono">Usuario</th>
                  <th className="py-4 px-6">Rol</th>
                  <th className="py-4 px-6 text-center">Acceso Directo</th>
                  <th className="py-4 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isSelf = u.username === currentUser.username;
                  return (
                    <tr key={u.username} className={`hover:bg-slate-50 text-xs text-slate-700 ${isSelf ? 'bg-blue-50/20' : ''}`}>
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          {u.fullName}
                          {isSelf && (
                            <span className="text-[9px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded">TÚ</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-6 font-mono text-slate-500">@{u.username}</td>
                      <td className="py-3.5 px-6">
                        {u.role === 'ADMIN' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                            <Shield size={10} /> Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase text-slate-500 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-200">
                            Empleado / Employee
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-center font-semibold">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                            Habilitado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">
                            Deshabilitado
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          {/* Toggle Active status */}
                          <button
                            onClick={() => handleToggleActive(u)}
                            disabled={isSelf}
                            title={u.isActive ? 'Desactivar Cuenta' : 'Activar Cuenta'}
                            className={`p-1.5 border rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed
                              ${u.isActive 
                                ? 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white' 
                                : 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-500 hover:text-white'}`}
                          >
                            {u.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => openPasswordModal(u)}
                            title="Actualizar Contraseña"
                            className="p-1.5 bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-500 hover:text-white rounded-lg transition-all cursor-pointer"
                          >
                            <Key size={14} />
                          </button>

                          {/* Edit Details */}
                          <button
                            onClick={() => openEditModal(u)}
                            title="Editar Perfil"
                            className="p-1.5 bg-blue-550/10 bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white rounded-lg transition-all cursor-pointer"
                          >
                            <Edit2 size={14} />
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
          <div className="py-24 text-center text-slate-500">
            <AlertTriangle size={32} className="mx-auto text-slate-400 mb-2" />
            <span className="font-semibold text-slate-600">Sin usuarios registrados</span>
            <p className="text-xs mt-1">Crea un nuevo usuario haciendo clic en el botón de arriba.</p>
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT USER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-xs">
          <div className="glass-panel border border-slate-200/80 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Users size={20} className="text-blue-600" />
              {editingUser ? 'Editar Empleado/Usuario' : 'Registrar Nuevo Empleado/Admin'}
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Nombre de Usuario (ID Único de Documento)
                </label>
                <input
                  type="text"
                  required
                  disabled={editingUser !== null} // Username is Document ID, immutable
                  placeholder="ej. pedro_empleado"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-950 text-sm focus:outline-none disabled:opacity-50 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Pedro Ramírez García"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-950 text-sm focus:outline-none"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Contraseña Inicial (Se hasheará en SHA-256)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Lock size={16} />
                    </span>
                    <input
                      type="password"
                      required
                      placeholder="Contraseña del empleado"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-950 text-sm focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Rol en Sistema
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'ADMIN' | 'EMPLOYEE')}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-950 text-xs focus:outline-none"
                  >
                    <option value="EMPLOYEE">Empleado (Employee)</option>
                    <option value="ADMIN">Administrador (Admin)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Estado Acceso
                  </label>
                  <select
                    value={isActive ? 'true' : 'false'}
                    onChange={(e) => setIsActive(e.target.value === 'true')}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-950 text-xs focus:outline-none"
                  >
                    <option value="true">Activo / Permitir</option>
                    <option value="false">Inactivo / Bloqueado</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-medium text-slate-700 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-semibold text-white transition-all shadow-md shadow-blue-600/10 cursor-pointer"
                >
                  Guardar Perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CAMBIAR / ACTUALIZAR CONTRASEÑA */}
      {isPasswordModalOpen && passwordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-xs">
          <div className="glass-panel border border-slate-200/80 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Key size={20} className="text-amber-500" />
              Restablecer Contraseña
            </h3>
            <p className="text-xs text-slate-500 mb-4">Actualizando credenciales de: <span className="text-slate-900 font-semibold font-mono">@{passwordUser.username}</span></p>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 4 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-950 text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Confirmar Contraseña
                </label>
                <input
                  type="password"
                  required
                  placeholder="Repite la contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-950 text-sm focus:outline-none"
                />
              </div>

              <p className="text-[10px] text-slate-400 leading-normal">
                *La contraseña se aplicará inmediatamente cifrada mediante SHA-256 de forma irreversible antes de actualizar Firestore. El empleado deberá iniciar sesión con esta nueva contraseña.
              </p>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-medium text-slate-700 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/10 cursor-pointer"
                >
                  Confirmar Nueva Contraseña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
