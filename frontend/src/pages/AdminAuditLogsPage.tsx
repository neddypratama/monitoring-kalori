<<<<<<< HEAD
import React, { useCallback, useEffect, useState } from 'react';
import { ClipboardList, RefreshCw, Search } from 'lucide-react';
import type { AdminUserSummary, AuditLogItem } from '../types';
import { api } from '../api/client';

interface AdminAuditLogsPageProps {
  onNotify: (type: 'success' | 'error', text: string) => void;
}

const ACTION_LABELS: Record<string, string> = {
  login: 'Login',
  logout: 'Logout',
  register: 'Register',
  change_password: 'Ubah Password',
  create_profile: 'Buat Profil',
  update_profile: 'Ubah Profil',
  create_food_log: 'Catat Makanan',
  update_food_log: 'Edit Makanan',
  delete_food_log: 'Hapus Makanan',
  create_activity_log: 'Catat Aktivitas',
  update_activity_log: 'Edit Aktivitas',
  delete_activity_log: 'Hapus Aktivitas',
  save_weight_log: 'Catat Berat Badan',
  delete_weight_log: 'Hapus Berat Badan',
  create_custom_food: 'Tambah Katalog Makanan',
  update_custom_food: 'Ubah Katalog Makanan',
  delete_custom_food: 'Hapus Katalog Makanan',
  create_custom_activity: 'Tambah Katalog Aktivitas',
  update_custom_activity: 'Ubah Katalog Aktivitas',
  delete_custom_activity: 'Hapus Katalog Aktivitas',
  create_user: 'Admin Tambah User',
  update_user: 'Admin Edit User',
  delete_user: 'Admin Hapus User',
  create_role: 'Admin Tambah Role',
  update_role: 'Admin Edit Role',
  delete_role: 'Admin Hapus Role',
  export_data: 'Ekspor JSON',
};

export const AdminAuditLogsPage: React.FC<AdminAuditLogsPageProps> = ({ onNotify }) => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedAction, setSelectedAction] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const [logList, userList] = await Promise.all([
        api.getAdminAuditLogs({
          user_id: selectedUserId ? Number(selectedUserId) : undefined,
          action: selectedAction !== 'all' ? selectedAction : undefined,
          q: search.trim() || undefined,
          limit: 200,
        }),
        api.getAdminUsers().catch(() => []),
      ]);
      setLogs(logList);
      setUsers(userList);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal memuat audit log.');
    } finally {
      setLoading(false);
    }
  }, [selectedUserId, selectedAction, search, onNotify]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-600" /> Log Aktivitas Sistem
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Rekaman otomatis seluruh aktivitas login, input kalori/aktivitas/berat badan, serta perubahan user &amp; role.
          </p>
        </div>
        <button
          type="button"
          onClick={loadLogs}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Muat Ulang
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari detail / username..."
            className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
        >
          <option value="">Semua User</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              @{u.username} ({u.full_name})
            </option>
          ))}
        </select>
        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
        >
          <option value="all">Semua Aksi</option>
          {Object.entries(ACTION_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Memuat log sistem...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">Belum ada log aktivitas yang cocok dengan filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">User (Actor)</th>
                  <th className="py-3 px-4">Aksi</th>
                  <th className="py-3 px-4">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap tabular-nums">{log.created_at}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-800">@{log.username_snapshot}</span>
                      {log.user_id && <span className="text-slate-400 ml-1">(#{log.user_id})</span>}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold">
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{log.details || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
=======
import React, { useCallback, useEffect, useState } from 'react';
import { ClipboardList, RefreshCw, Search } from 'lucide-react';
import type { AdminUserSummary, AuditLogItem } from '../types';
import { api } from '../api/client';

interface AdminAuditLogsPageProps {
  onNotify: (type: 'success' | 'error', text: string) => void;
}

const ACTION_LABELS: Record<string, string> = {
  login: 'Login',
  logout: 'Logout',
  register: 'Register',
  change_password: 'Ubah Password',
  create_profile: 'Buat Profil',
  update_profile: 'Ubah Profil',
  create_food_log: 'Catat Makanan',
  update_food_log: 'Edit Makanan',
  delete_food_log: 'Hapus Makanan',
  create_activity_log: 'Catat Aktivitas',
  update_activity_log: 'Edit Aktivitas',
  delete_activity_log: 'Hapus Aktivitas',
  save_weight_log: 'Catat Berat Badan',
  delete_weight_log: 'Hapus Berat Badan',
  create_custom_food: 'Tambah Katalog Makanan',
  update_custom_food: 'Ubah Katalog Makanan',
  delete_custom_food: 'Hapus Katalog Makanan',
  create_custom_activity: 'Tambah Katalog Aktivitas',
  update_custom_activity: 'Ubah Katalog Aktivitas',
  delete_custom_activity: 'Hapus Katalog Aktivitas',
  create_user: 'Admin Tambah User',
  update_user: 'Admin Edit User',
  delete_user: 'Admin Hapus User',
  create_role: 'Admin Tambah Role',
  update_role: 'Admin Edit Role',
  delete_role: 'Admin Hapus Role',
  export_data: 'Ekspor JSON',
};

export const AdminAuditLogsPage: React.FC<AdminAuditLogsPageProps> = ({ onNotify }) => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedAction, setSelectedAction] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const [logList, userList] = await Promise.all([
        api.getAdminAuditLogs({
          user_id: selectedUserId ? Number(selectedUserId) : undefined,
          action: selectedAction !== 'all' ? selectedAction : undefined,
          q: search.trim() || undefined,
          limit: 200,
        }),
        api.getAdminUsers().catch(() => []),
      ]);
      setLogs(logList);
      setUsers(userList);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal memuat audit log.');
    } finally {
      setLoading(false);
    }
  }, [selectedUserId, selectedAction, search, onNotify]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-600" /> Log Aktivitas Sistem
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Rekaman otomatis seluruh aktivitas login, input kalori/aktivitas/berat badan, serta perubahan user &amp; role.
          </p>
        </div>
        <button
          type="button"
          onClick={loadLogs}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Muat Ulang
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari detail / username..."
            className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
        >
          <option value="">Semua User</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              @{u.username} ({u.full_name})
            </option>
          ))}
        </select>
        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
        >
          <option value="all">Semua Aksi</option>
          {Object.entries(ACTION_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Memuat log sistem...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">Belum ada log aktivitas yang cocok dengan filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">User (Actor)</th>
                  <th className="py-3 px-4">Aksi</th>
                  <th className="py-3 px-4">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap tabular-nums">{log.created_at}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-800">@{log.username_snapshot}</span>
                      {log.user_id && <span className="text-slate-400 ml-1">(#{log.user_id})</span>}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold">
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{log.details || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
>>>>>>> 14f90995ced414a546f88517b9802fe68493c8b9
