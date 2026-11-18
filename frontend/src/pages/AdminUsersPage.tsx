import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  Flame,
  Loader2,
  Scale,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type {
  AdminUserOverview,
  AdminUserSummary,
  AuthUser,
  DashboardRange,
  RoleItem,
} from '../types';
import { api } from '../api/client';
import { FormStatusBanner } from '../components/FormStatusBanner';
import { PasswordInput } from '../components/PasswordInput';
import { formatDateId, formatNum, getLocalDateIso } from '../utils/calculators';

interface AdminUsersPageProps {
  currentUser: AuthUser;
  onNotify: (type: 'success' | 'error', text: string) => void;
}

export const AdminUsersPage: React.FC<AdminUsersPageProps> = ({ currentUser, onNotify }) => {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active'>('all');
  const [activatingId, setActivatingId] = useState<number | null>(null);

  // Create / Edit User modal
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserSummary | null>(null);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState<number>(2);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Monitor User Diet modal
  const [overview, setOverview] = useState<AdminUserOverview | null>(null);
  const [overviewRange, setOverviewRange] = useState<DashboardRange>('7d');
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [monitorUserId, setMonitorUserId] = useState<number | null>(null);

  const canManage = currentUser.permissions.can_manage_users;
  const canViewData = currentUser.permissions.can_view_all_users_data;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [uList, rList] = await Promise.all([
        api.getAdminUsers(getLocalDateIso()),
        canManage ? api.getAdminRoles() : Promise.resolve([]),
      ]);
      setUsers(uList);
      setRoles(rList);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal memuat daftar user.');
    } finally {
      setLoading(false);
    }
  }, [canManage, onNotify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setEditingUser(null);
    setUsername('');
    setFullName('');
    setPassword('');
    const userRole = roles.find((r) => r.name === 'user') ?? roles[0];
    setRoleId(userRole ? userRole.id : 2);
    setIsActive(true);
    setFormError(null);
    setShowForm(true);
  };

  const openEditModal = (u: AdminUserSummary) => {
    setEditingUser(u);
    setUsername(u.username);
    setFullName(u.full_name);
    setPassword('');
    setRoleId(u.role_id);
    setIsActive(u.is_active);
    setFormError(null);
    setShowForm(true);
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (editingUser) {
        await api.updateAdminUser(editingUser.id, {
          username: username.trim(),
          full_name: fullName.trim(),
          role_id: roleId,
          is_active: isActive,
          password: password.trim() || undefined,
        });
        onNotify('success', `Akun @${username.trim()} berhasil diperbarui.`);
      } else {
        await api.createAdminUser({
          username: username.trim(),
          full_name: fullName.trim(),
          password,
          role_id: roleId,
          is_active: isActive,
        });
        onNotify('success', `User baru @${username.trim()} berhasil didaftarkan.`);
      }
      setShowForm(false);
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan user.';
      setFormError(msg);
      onNotify('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (u: AdminUserSummary) => {
    if (!window.confirm(`Hapus user "@${u.username}" beserta seluruh catatan kalori & berat badannya?`)) return;
    try {
      await api.deleteAdminUser(u.id);
      onNotify('success', `User @${u.username} berhasil dihapus.`);
      await loadData();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menghapus user.');
    }
  };

  const handleActivateUser = async (u: AdminUserSummary) => {
    setActivatingId(u.id);
    try {
      await api.updateAdminUser(u.id, { is_active: true });
      onNotify('success', `Akun @${u.username} berhasil diaktifkan dan kini bisa login.`);
      await loadData();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal mengaktifkan user.');
    } finally {
      setActivatingId(null);
    }
  };

  const pendingCount = users.filter((u) => !u.is_active).length;
  const visibleUsers = users.filter((u) => {
    if (statusFilter === 'pending') return !u.is_active;
    if (statusFilter === 'active') return u.is_active;
    return true;
  });

  const openMonitor = async (uid: number, nextRange: DashboardRange = '7d') => {
    setMonitorUserId(uid);
    setOverviewRange(nextRange);
    setOverviewLoading(true);
    try {
      const res = await api.getAdminUserOverview(uid, nextRange, getLocalDateIso());
      setOverview(res);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal memuat data diet user.');
      setMonitorUserId(null);
    } finally {
      setOverviewLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" /> Kelola User &amp; Pantau Diet
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftarkan akun user baru, atur role/status, reset password, dan pantau progres kalori tiap user.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-xs cursor-pointer self-start"
          >
            <UserPlus className="w-4 h-4" /> Tambah User
          </button>
        )}
      </div>

      {/* Pending Activation Alert & Status Filter Bar */}
      {!loading && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {pendingCount > 0 ? (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Ada <strong>{pendingCount} akun</strong> berstatus belum aktif / menunggu aktivasi Admin.
              </span>
            </div>
          ) : (
            <div />
          )}

          <div className="inline-flex p-1 rounded-xl bg-slate-100 self-start">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Semua ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                statusFilter === 'pending' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-700'
              }`}
            >
              Belum Aktif ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                statusFilter === 'active' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              Aktif ({users.length - pendingCount})
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Memuat daftar user...</div>
        ) : visibleUsers.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            {statusFilter === 'pending'
              ? 'Tidak ada akun yang menunggu aktivasi saat ini.'
              : 'Belum ada user pada filter ini.'}
          </div>
        ) : (
          <>
            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-slate-100">
              {visibleUsers.map((u) => (
                <div key={`m-${u.id}`} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">
                        {u.full_name || u.username}{' '}
                        {u.id === currentUser.id && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                            Anda
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        @{u.username} • ID #{u.id}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-bold uppercase">
                        {u.role_name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {u.is_active ? 'Aktif' : 'Belum Aktif'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 rounded-2xl p-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">BB Terkini</p>
                      <p className="font-bold text-indigo-700 tabular-nums mt-0.5">
                        {u.latest_weight_kg !== null ? `${formatNum(u.latest_weight_kg, 1)} kg` : 'Belum isi profil'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Kalori Hari Ini</p>
                      <p className="tabular-nums mt-0.5">
                        <span className="font-bold text-emerald-700">{formatNum(u.today_calories_in)}</span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="font-bold text-amber-600">-{formatNum(u.today_calories_burned)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                    <span className="text-[11px] text-slate-500 tabular-nums">
                      {u.total_food_logs} makan • {u.total_activity_logs} akt • {u.total_weight_logs} BB
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {canManage && !u.is_active && (
                        <button
                          type="button"
                          disabled={activatingId === u.id}
                          onClick={() => handleActivateUser(u)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
                        >
                          {activatingId === u.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          Aktifkan
                        </button>
                      )}
                      {canViewData && (
                        <button
                          type="button"
                          onClick={() => openMonitor(u.id)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Pantau
                        </button>
                      )}
                      {canManage && (
                        <>
                          <button
                            type="button"
                            aria-label={`Edit ${u.username}`}
                            onClick={() => openEditModal(u)}
                            className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {u.id !== currentUser.id && (
                            <button
                              type="button"
                              aria-label={`Hapus ${u.username}`}
                              onClick={() => handleDeleteUser(u)}
                              className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tablet & Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">User</th>
                    <th className="py-3.5 px-4">Role &amp; Status</th>
                    <th className="py-3.5 px-4">BB Terkini</th>
                    <th className="py-3.5 px-4">Kalori Hari Ini</th>
                    <th className="py-3.5 px-4">Total Catatan</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {visibleUsers.map((u) => (
                    <tr key={u.id} className={`hover:bg-slate-50/70 ${!u.is_active ? 'bg-amber-50/30' : ''}`}>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">
                          {u.full_name || u.username}{' '}
                          {u.id === currentUser.id && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                              Anda
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500">
                          @{u.username} • ID #{u.id}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[11px] font-bold uppercase">
                            {u.role_name}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {u.is_active ? 'Aktif' : 'Belum Aktif'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 tabular-nums">
                        {u.latest_weight_kg !== null ? (
                          <span className="font-bold text-indigo-700">{formatNum(u.latest_weight_kg, 1)} kg</span>
                        ) : (
                          <span className="text-xs text-slate-400">Belum isi profil</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums text-xs">
                        <span className="font-bold text-emerald-700">{formatNum(u.today_calories_in)} masuk</span>
                        <span className="text-slate-400 mx-1">•</span>
                        <span className="font-bold text-amber-600">{formatNum(u.today_calories_burned)} keluar</span>
                      </td>
                      <td className="py-3.5 px-4 tabular-nums text-xs text-slate-600">
                        {u.total_food_logs} makan • {u.total_activity_logs} aktivitas • {u.total_weight_logs} BB
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManage && !u.is_active && (
                            <button
                              type="button"
                              disabled={activatingId === u.id}
                              onClick={() => handleActivateUser(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
                            >
                              {activatingId === u.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              Aktifkan
                            </button>
                          )}
                          {canViewData && (
                            <button
                              type="button"
                              onClick={() => openMonitor(u.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" /> Pantau
                            </button>
                          )}
                          {canManage && (
                            <>
                              <button
                                type="button"
                                aria-label={`Edit ${u.username}`}
                                onClick={() => openEditModal(u)}
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              {u.id !== currentUser.id && (
                                <button
                                  type="button"
                                  aria-label={`Hapus ${u.username}`}
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add / Edit User Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[92dvh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold">{editingUser ? 'Edit User' : 'Daftarkan User Baru'}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitUser} className="p-5 sm:p-6 space-y-3.5 overflow-y-auto pb-safe">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="huruf kecil, angka, _ atau ."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password {editingUser && <span className="font-normal text-slate-400">(kosongkan jika tidak diubah)</span>}
                </label>
                <PasswordInput
                  required={!editingUser}
                  minLength={editingUser ? undefined : 6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="py-2"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {r.description || 'Role kustom'}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600"
                />
                Akun Aktif (bisa login)
              </label>

              {saving && <FormStatusBanner variant="loading" message="Menyimpan data akun user ke server..." />}
              {!saving && formError && <FormStatusBanner variant="error" message={formError} />}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" disabled={saving} onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50 cursor-pointer">
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold cursor-pointer"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Diet Monitor Modal */}
      {monitorUserId !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-3xl max-h-[92dvh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50 shrink-0">
              <div className="min-w-0 pr-2">
                <h3 className="text-base font-extrabold text-slate-900 truncate">
                  Pantau Progres Diet: {overview?.user.full_name || overview?.user.username || '...'}
                </h3>
                {overview && (
                  <p className="text-xs text-slate-500">
                    @{overview.user.username} • Role {overview.user.role_name}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setMonitorUserId(null);
                  setOverview(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 pb-safe">
              {overviewLoading || !overview ? (
                <div className="py-10 text-center text-sm text-slate-500">Memuat ringkasan kalori &amp; berat badan...</div>
              ) : !overview.has_profile || !overview.dashboard ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  User ini belum mengisi profil awal program dietnya.
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Status Evaluasi: <strong className="text-emerald-700">{overview.dashboard.evaluation.label}</strong>
                    </span>
                    <div className="flex gap-1">
                      {(['7d', '14d', '30d', 'all'] as DashboardRange[]).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => openMonitor(monitorUserId, r)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                            overviewRange === r ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {r === 'all' ? 'Semua' : r.replace('d', ' Hari')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/70">
                      <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5" /> Kalori Masuk Hari Ini
                      </p>
                      <p className="text-xl font-extrabold text-slate-900 tabular-nums mt-1">
                        {formatNum(overview.dashboard.today_summary.calories_in)} / {formatNum(overview.dashboard.today_summary.daily_target)} kkal
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70">
                      <p className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5" /> Kalori Keluar Hari Ini
                      </p>
                      <p className="text-xl font-extrabold text-amber-700 tabular-nums mt-1">
                        {formatNum(overview.dashboard.today_summary.calories_burned)} kkal
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/70">
                      <p className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
                        <Scale className="w-3.5 h-3.5" /> Berat Badan &amp; BMI
                      </p>
                      <p className="text-xl font-extrabold text-indigo-700 tabular-nums mt-1">
                        {formatNum(overview.dashboard.metrics.current_weight_kg, 1)} kg{' '}
                        <span className="text-xs font-semibold">({overview.dashboard.metrics.bmi_category})</span>
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
                    {overview.dashboard.evaluation.explanation}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-slate-200 rounded-2xl p-4">
                      <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Catatan Makanan Terbaru</h4>
                      {overview.recent_food_logs.length === 0 ? (
                        <p className="text-xs text-slate-400">Belum ada catatan makanan.</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {overview.recent_food_logs.map((fl) => (
                            <div key={fl.id} className="flex justify-between text-xs border-b border-slate-100 pb-1.5">
                              <div>
                                <p className="font-semibold text-slate-800">{fl.food_name}</p>
                                <p className="text-[11px] text-slate-400">{formatDateId(fl.log_date, true)} • {fl.quantity} {fl.unit}</p>
                              </div>
                              <span className="font-bold text-emerald-700 tabular-nums">{fl.calories} kkal</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border border-slate-200 rounded-2xl p-4">
                      <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Aktivitas &amp; BB Terbaru</h4>
                      {overview.recent_activity_logs.length === 0 && overview.recent_weight_logs.length === 0 ? (
                        <p className="text-xs text-slate-400">Belum ada aktivitas atau penimbangan.</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {overview.recent_activity_logs.map((al) => (
                            <div key={`a-${al.id}`} className="flex justify-between text-xs border-b border-slate-100 pb-1.5">
                              <div>
                                <p className="font-semibold text-slate-800">{al.activity_name}</p>
                                <p className="text-[11px] text-slate-400">
                                  {formatDateId(al.log_date, true)} • {al.input_value} {al.input_unit}
                                </p>
                              </div>
                              <span className="font-bold text-amber-600 tabular-nums">-{al.calories_burned} kkal</span>
                            </div>
                          ))}
                          {overview.recent_weight_logs.map((wl) => (
                            <div key={`w-${wl.id}`} className="flex justify-between text-xs border-b border-slate-100 pb-1.5">
                              <span className="text-slate-600">Timbang ({formatDateId(wl.log_date, true)})</span>
                              <span className="font-bold text-indigo-700 tabular-nums">{formatNum(wl.weight_kg, 1)} kg</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
