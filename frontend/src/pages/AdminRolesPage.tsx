import React, { useCallback, useEffect, useState } from 'react';
import { Check, Edit3, Plus, Shield, Trash2, X } from 'lucide-react';
import type { RoleItem } from '../types';
import { api } from '../api/client';

interface AdminRolesPageProps {
  onNotify: (type: 'success' | 'error', text: string) => void;
}

export const AdminRolesPage: React.FC<AdminRolesPageProps> = ({ onNotify }) => {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<RoleItem | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [canManageRoles, setCanManageRoles] = useState(false);
  const [canViewAllData, setCanViewAllData] = useState(false);
  const [canViewAuditLogs, setCanViewAuditLogs] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      setRoles(await api.getAdminRoles());
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal memuat daftar role.');
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const openNew = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setCanManageUsers(false);
    setCanManageRoles(false);
    setCanViewAllData(true);
    setCanViewAuditLogs(false);
    setShowModal(true);
  };

  const openEdit = (r: RoleItem) => {
    setEditing(r);
    setName(r.name);
    setDescription(r.description);
    setCanManageUsers(r.can_manage_users);
    setCanManageRoles(r.can_manage_roles);
    setCanViewAllData(r.can_view_all_users_data);
    setCanViewAuditLogs(r.can_view_audit_logs);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        can_manage_users: canManageUsers,
        can_manage_roles: canManageRoles,
        can_view_all_users_data: canViewAllData,
        can_view_audit_logs: canViewAuditLogs,
      };
      if (editing) {
        await api.updateAdminRole(editing.id, payload);
        onNotify('success', `Role "${editing.name}" berhasil diperbarui.`);
      } else {
        await api.createAdminRole(payload);
        onNotify('success', `Role "${name.trim()}" berhasil dibuat.`);
      }
      setShowModal(false);
      await loadRoles();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menyimpan role.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: RoleItem) => {
    if (!window.confirm(`Hapus role "${r.name}"?`)) return;
    try {
      await api.deleteAdminRole(r.id);
      onNotify('success', `Role "${r.name}" dihapus.`);
      await loadRoles();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menghapus role.');
    }
  };

  const permBadge = (active: boolean, label: string) => (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
        active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' : 'bg-slate-100 text-slate-400'
      }`}
    >
      {active && <Check className="w-3 h-3" />}
      {label}
    </span>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" /> Kelola Role &amp; Hak Akses
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Atur role pengguna dan izin akses untuk mengelola user, memantau data diet, maupun melihat log sistem.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-xs cursor-pointer self-start"
        >
          <Plus className="w-4 h-4" /> Tambah Role
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-slate-500">Memuat daftar role...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((r) => (
            <div key={r.id} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900 uppercase">{r.name}</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        r.is_system ? 'bg-slate-900 text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {r.is_system ? 'Bawaan' : 'Kustom'}
                    </span>
                    <span className="text-xs text-slate-400 tabular-nums">{r.user_count} user</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{r.description || 'Tidak ada deskripsi.'}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Edit role ${r.name}`}
                    onClick={() => openEdit(r)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  {!r.is_system && (
                    <button
                      type="button"
                      aria-label={`Hapus role ${r.name}`}
                      onClick={() => handleDelete(r)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                {permBadge(r.can_manage_users, 'Kelola User')}
                {permBadge(r.can_manage_roles, 'Kelola Role')}
                {permBadge(r.can_view_all_users_data, 'Pantau Data Diet User')}
                {permBadge(r.can_view_audit_logs, 'Lihat Log Sistem')}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[92dvh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold">{editing ? `Edit Role: ${editing.name}` : 'Buat Role Baru'}</h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4 overflow-y-auto pb-safe">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Role</label>
                <input
                  type="text"
                  required
                  disabled={editing?.is_system}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: coach atau nutrisionis"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Bisa memantau progres diet semua user"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2.5 pt-1">
                <p className="text-xs font-bold text-slate-700">Hak Akses</p>
                {[
                  { label: 'Kelola User (tambah, edit, hapus akun)', val: canManageUsers, set: setCanManageUsers },
                  { label: 'Kelola Role & Hak Akses', val: canManageRoles, set: setCanManageRoles },
                  { label: 'Pantau Data Kalori & Berat Badan Semua User', val: canViewAllData, set: setCanViewAllData },
                  { label: 'Lihat Log Aktivitas Sistem (Audit Log)', val: canViewAuditLogs, set: setCanViewAuditLogs },
                ].map((item) => (
                  <label key={item.label} className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={editing?.name === 'admin'}
                      checked={item.val}
                      onChange={(e) => item.set(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600"
                    />
                    {item.label}
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100">
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
