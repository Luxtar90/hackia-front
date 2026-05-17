import { useEffect, useState } from 'react';
import {
  Users, Menu, ChevronDown, CheckCircle, XCircle,
  Loader, Pencil, UserPlus, X, Save, DollarSign,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { adminApi } from '../lib/api';
import { cn } from '../lib/utils';

interface UsersViewProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

interface UserRow {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  activo: boolean;
  pacientes: string[];
}

// ── Edit User Modal ──────────────────────────────────────────────────────────
function EditUserModal({ user, onClose, onSaved, isES }: {
  user: UserRow;
  onClose: () => void;
  onSaved: (updated: UserRow) => void;
  isES: boolean;
}) {
  const [nombre, setNombre] = useState(user.nombre || '');
  const [email, setEmail]   = useState(user.email  || '');
  const [rol, setRol]       = useState(user.rol    || 'patient');
  const [activo, setActivo] = useState(user.activo);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await adminApi.updateUser(user.id, { nombre, email, rol, activo });
      onSaved({ ...user, nombre, email, rol, activo });
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div
        className="absolute inset-0 bg-slate-950/20 dark:bg-slate-950/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[28px] border border-white/50 dark:border-white/5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-500/10 rounded-full flex items-center justify-center shrink-0">
              <Pencil size={15} className="text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                {isES ? 'Editar Usuario' : 'Edit User'}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium truncate max-w-[200px]">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl p-3 text-red-600 dark:text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Nombre */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              {isES ? 'Nombre' : 'Name'}
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 outline-none border-none"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 outline-none border-none"
            />
          </div>

          {/* Rol */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              {isES ? 'Rol' : 'Role'}
            </label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 outline-none border-none"
            >
              <option value="user">{isES ? 'Usuario' : 'User'}</option>
              <option value="patient">{isES ? 'Paciente' : 'Patient'}</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Estado toggle */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {isES ? 'Estado' : 'Status'}
            </span>
            <div className="flex items-center gap-3">
              <span className={cn('text-xs font-bold', activo ? 'text-teal-600' : 'text-slate-400')}>
                {activo ? (isES ? 'Activo' : 'Active') : (isES ? 'Inactivo' : 'Inactive')}
              </span>
              <button
                type="button"
                onClick={() => setActivo(!activo)}
                className={cn(
                  'relative w-11 h-6 rounded-full transition-colors duration-200',
                  activo ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-600'
                )}
              >
                <span className={cn(
                  'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
                  activo ? 'translate-x-5' : 'translate-x-0'
                )} />
              </button>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              {isES ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold shadow-md shadow-teal-500/10 transition-all active:scale-[0.97] disabled:opacity-60"
            >
              {loading ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
              {isES ? 'Guardar' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Create Patient Modal ─────────────────────────────────────────────────────
interface Plan {
  pageId: string;
  idPlan: string;
  nombre: string;
  aseguradora: string;
}

function CreatePatientModal({ user, onClose, onCreated, isES }: {
  user: UserRow;
  onClose: () => void;
  onCreated: () => void;
  isES: boolean;
}) {
  const [estado, setEstado]       = useState<'Activo' | 'Inactivo'>('Activo');
  const [planPageId, setPlanPageId] = useState('');
  const [deducible, setDeducible]  = useState('');
  const [loading, setLoading]      = useState(false);
  const [error, setError]          = useState<string | null>(null);
  const [success, setSuccess]      = useState(false);
  const [plans, setPlans]          = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    adminApi.getPlans()
      .then((r) => { if (r.success) setPlans(r.data); })
      .catch(() => {})
      .finally(() => setLoadingPlans(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await adminApi.createPatient({
        numeroPoliza: user.id,
        email: user.email,
        nombreCompleto: user.nombre,
        planPageId: planPageId || undefined,
        deducibleRestante: deducible ? parseFloat(deducible) : undefined,
        estado,
      });
      setSuccess(true);
      setTimeout(() => { onCreated(); }, 1200);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div
        className="absolute inset-0 bg-slate-950/20 dark:bg-slate-950/40 backdrop-blur-[2px]"
        onClick={!loading ? onClose : undefined}
      />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[28px] border border-white/50 dark:border-white/5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-500/10 rounded-full flex items-center justify-center shrink-0">
              <UserPlus size={15} className="text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                {isES ? 'Crear Paciente' : 'Create Patient'}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium truncate max-w-[200px]">{user.nombre}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="px-6 py-10 flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-teal-50 dark:bg-teal-900/20 rounded-full flex items-center justify-center">
              <CheckCircle size={24} className="text-teal-600" />
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {isES ? '¡Paciente creado correctamente!' : 'Patient created successfully!'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl p-3 text-red-600 dark:text-red-400 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Póliza + Email (read-only) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  {isES ? 'N° Póliza' : 'Policy No.'}
                </label>
                <div
                  className="bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-400 font-mono truncate"
                  title={user.id ?? ''}
                >
                  {user.id ? `${user.id.slice(0, 14)}…` : '—'}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email</label>
                <div
                  className="bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-400 truncate"
                  title={user.email}
                >
                  {user.email}
                </div>
              </div>
            </div>

            {/* Nombre completo (read-only) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                {isES ? 'Nombre Completo' : 'Full Name'}
              </label>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-400">
                {user.nombre || '—'}
              </div>
            </div>

            {/* Estado */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                {isES ? 'Estado' : 'Status'}
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as 'Activo' | 'Inactivo')}
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 outline-none border-none"
              >
                <option value="Activo">{isES ? 'Activo' : 'Active'}</option>
                <option value="Inactivo">{isES ? 'Inactivo' : 'Inactive'}</option>
              </select>
            </div>

            {/* Plan */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Plan</label>
              <select
                value={planPageId}
                onChange={(e) => setPlanPageId(e.target.value)}
                disabled={loadingPlans}
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 outline-none border-none disabled:opacity-60"
              >
                <option value="">{loadingPlans ? (isES ? 'Cargando planes...' : 'Loading plans...') : (isES ? 'Sin plan asignado' : 'No plan assigned')}</option>
                {plans.map((p) => (
                  <option key={p.pageId} value={p.pageId}>
                    {p.nombre}{p.aseguradora ? ` — ${p.aseguradora}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Deducible */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                {isES ? 'Deducible Restante' : 'Remaining Deductible'}
              </label>
              <div className="relative">
                <DollarSign size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={deducible}
                  onChange={(e) => setDeducible(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 outline-none border-none"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {isES ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold shadow-md shadow-teal-500/10 transition-all active:scale-[0.97] disabled:opacity-60"
              >
                {loading ? <Loader size={14} className="animate-spin" /> : <UserPlus size={14} />}
                {isES ? 'Crear' : 'Create'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Main View ────────────────────────────────────────────────────────────────
export function UsersView({ isSidebarOpen, setIsSidebarOpen }: UsersViewProps) {
  const { language } = useAppStore();
  const [users, setUsers]           = useState<UserRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [hasMore, setHasMore]       = useState(false);
  const [cursor, setCursor]         = useState<string | undefined>(undefined);

  const [editUser, setEditUser]           = useState<UserRow | null>(null);
  const [createPatientUser, setCreatePatientUser] = useState<UserRow | null>(null);

  const isES = language === 'Español';

  const fetchUsers = async (nextCursor?: string) => {
    try {
      const response = await adminApi.listUsers(20, nextCursor);
      if (response.success) {
        setUsers((prev) => nextCursor ? [...prev, ...response.data] : response.data);
        setHasMore(response.pagination.hasMore);
        setCursor(response.pagination.nextCursor);
      }
    } catch (err: any) {
      setError(err.message || (isES ? 'Error al cargar usuarios' : 'Error loading users'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await fetchUsers(cursor);
  };

  const handleUserSaved = (updated: UserRow) => {
    setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u));
    setEditUser(null);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="h-[65px] px-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4 shrink-0">
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Menu size={20} />
          </button>
        )}
        <div className="flex items-center gap-2">
          <Users size={20} className="text-teal-600" />
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            {isES ? 'Usuarios' : 'Users'}
          </h1>
        </div>
        <span className="ml-auto text-xs text-slate-400 font-medium">
          {isES ? `${users.length} registros` : `${users.length} records`}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-48 gap-3 text-slate-400">
            <Loader size={20} className="animate-spin" />
            <span className="text-sm">{isES ? 'Cargando usuarios...' : 'Loading users...'}</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-48 text-red-500 text-sm">{error}</div>
        ) : users.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
            {isES ? 'No hay usuarios registrados' : 'No users found'}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  {[
                    isES ? 'Nombre' : 'Name',
                    'Email',
                    isES ? 'Rol' : 'Role',
                    isES ? 'Estado' : 'Status',
                    isES ? 'Pacientes' : 'Patients',
                    isES ? 'Opciones' : 'Options',
                  ].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => (
                  <tr
                    key={user.id}
                    className={cn(
                      'border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors',
                      i % 2 !== 0 && 'bg-slate-50/50 dark:bg-slate-800/10'
                    )}
                  >
                    <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      {user.nombre || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                      {user.email}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        'inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide',
                        user.rol === 'admin'
                          ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400'
                          : user.rol === 'patient'
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      )}>
                        {user.rol}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {user.activo ? (
                        <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-semibold text-xs whitespace-nowrap">
                          <CheckCircle size={14} />
                          {isES ? 'Activo' : 'Active'}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-slate-400 font-semibold text-xs whitespace-nowrap">
                          <XCircle size={14} />
                          {isES ? 'Inactivo' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                      {user.pacientes?.length ?? 0}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setEditUser(user)}
                          title={isES ? 'Editar usuario' : 'Edit user'}
                          className="p-2 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setCreatePatientUser(user)}
                          title={isES ? 'Crear paciente' : 'Create patient'}
                          className="p-2 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all"
                        >
                          <UserPlus size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {hasMore && (
              <div className="flex justify-center p-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? <Loader size={14} className="animate-spin" /> : <ChevronDown size={14} />}
                  {isES ? 'Cargar más' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={handleUserSaved}
          isES={isES}
        />
      )}
      {createPatientUser && (
        <CreatePatientModal
          user={createPatientUser}
          onClose={() => setCreatePatientUser(null)}
          onCreated={() => setCreatePatientUser(null)}
          isES={isES}
        />
      )}
    </div>
  );
}
