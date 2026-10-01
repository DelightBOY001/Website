'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Users, Search, Shield, Ban, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useFetch, api } from '@/hooks/useData';
import { useToast } from '@/components/ui/toast';
import { Avatar, RoleBadge, StatusBadge, Tabs, Pagination } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Modal, ConfirmDialog } from '@/components/ui/dialog';
import { Skeleton, EmptyState } from '@/components/ui/states';
import { formatDate, cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export default function AdminUsersPage() {
  const toast = useToast();
  const { user: me } = useAuth();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any>(null);
  const [action, setAction] = useState<'ban' | 'unban' | 'role' | null>(null);
  const [newRole, setNewRole] = useState('player');
  const [busy, setBusy] = useState(false);

  const qs = new URLSearchParams();
  if (search) qs.set('search', search);
  if (role) qs.set('role', role);
  if (status) qs.set('status', status);
  qs.set('page', String(page));
  qs.set('limit', '20');

  const { data, loading, refetch } = useFetch<any>(`/api/admin/users?${qs.toString()}`);

  const runAction = async () => {
    if (!selected || !action) return;
    setBusy(true);
    try {
      const body: Record<string, unknown> =
        action === 'ban'
          ? { status: 'banned', banReason: 'Violation of platform rules' }
          : action === 'unban'
            ? { status: 'active' }
            : { role: newRole };
      await api(`/api/admin/users/${selected._id}`, { method: 'PATCH', body });
      toast.success('User updated!');
      setAction(null);
      setSelected(null);
      refetch();
    } catch (err) {
      toast.error('Update failed', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell section="admin" title="User Management" subtitle="Search, moderate and manage roles.">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, email, player ID…"
            className="pl-10"
          />
        </div>
        <Select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="w-40">
          <option value="">All roles</option>
          <option value="player">Player</option>
          <option value="organizer">Organizer</option>
          <option value="moderator">Moderator</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super Admin</option>
        </Select>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-40">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </Select>
      </div>

      <div className="glass mt-6 overflow-x-auto">
        <table className="table-base min-w-[860px]">
          <thead>
            <tr>
              <th>User</th>
              <th>Player ID</th>
              <th>Role</th>
              <th>Status</th>
              <th>Points</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j}>
                      <Skeleton className="h-5 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (data?.items ?? []).length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState icon={<Users className="h-8 w-8" />} title="No users found" body="Try a different search." />
                </td>
              </tr>
            ) : (
              (data?.items ?? []).map((u: any) => (
                <tr key={u._id}>
                  <td>
                    <Link href={`/admin/users/${u._id}`} className="flex items-center gap-3 hover:text-neon-cyan">
                      <Avatar name={u.name} src={u.avatar} size="sm" />
                      <div>
                        <p className="font-medium text-white">{u.name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="font-mono text-xs text-neon-cyan">{u.playerId}</td>
                  <td>
                    <RoleBadge role={u.role} />
                  </td>
                  <td>
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="text-slate-300">{u.stats?.points ?? 0}</td>
                  <td className="text-xs text-slate-500">{formatDate(u.createdAt)}</td>
                  <td>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          setSelected(u);
                          setNewRole(u.role);
                          setAction('role');
                        }}
                        className="rounded-lg border border-white/10 p-1.5 text-slate-400 transition hover:border-neon-cyan/40 hover:text-neon-cyan"
                        title="Change role"
                      >
                        <Shield className="h-3.5 w-3.5" />
                      </button>
                      {u.status === 'banned' ? (
                        <button
                          onClick={() => {
                            setSelected(u);
                            setAction('unban');
                          }}
                          className="rounded-lg border border-white/10 p-1.5 text-emerald-400 transition hover:border-emerald-400/40"
                          title="Unban"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          disabled={u._id === me?.id}
                          onClick={() => {
                            setSelected(u);
                            setAction('ban');
                          }}
                          className="rounded-lg border border-white/10 p-1.5 text-rose-400 transition hover:border-rose-400/40 disabled:opacity-30"
                          title="Ban user"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <Pagination page={page} pages={data?.pages ?? 1} onChange={setPage} />
      </div>

      {/* Role modal */}
      <Modal open={action === 'role'} onClose={() => setAction(null)} title={`Change role — ${selected?.name}`}>
        <div className="space-y-4">
          <Select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
            <option value="player">Player</option>
            <option value="organizer">Organizer</option>
            <option value="moderator">Moderator</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </Select>
          <Button onClick={runAction} loading={busy} className="w-full">
            UPDATE ROLE
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={action === 'ban'}
        onClose={() => setAction(null)}
        onConfirm={runAction}
        title="Ban this user?"
        message={`${selected?.name} will lose access to the platform immediately. This action is logged.`}
        confirmLabel="Ban user"
        danger
        loading={busy}
      />

      <ConfirmDialog
        open={action === 'unban'}
        onClose={() => setAction(null)}
        onConfirm={runAction}
        title="Unban this user?"
        message={`${selected?.name} will regain full access to the platform.`}
        confirmLabel="Unban"
        loading={busy}
      />
    </AppShell>
  );
}
