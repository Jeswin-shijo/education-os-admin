import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import type { PlatformUser, Role } from '../../data/types';
import {
  PageHeader,
  SearchBar,
  Table,
  type Column,
  Avatar,
  Select,
  StatusPill,
  Button,
  Banner,
  Loading,
  EmptyState,
} from '../../components';

const ROLES: Role[] = ['student', 'parent', 'faculty', 'hod', 'principal', 'admin'];

const roleOptions = ROLES.map((r) => ({ label: r.charAt(0).toUpperCase() + r.slice(1), value: r }));

const roleFilterOptions = [{ label: 'All roles', value: '' }, ...roleOptions];

export function UsersRolesPage() {
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const {
    data: rows,
    loading,
    reload,
  } = useAsync(() => adminService.users.list(q, roleFilter || undefined), [q, roleFilter]);

  const [actionError, setActionError] = useState<string>();
  const [busyId, setBusyId] = useState<string>();

  async function handleRoleChange(user: PlatformUser, role: Role) {
    setBusyId(user.id);
    try {
      await adminService.users.updateRole(user.id, role);
      setActionError(undefined);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not change role');
    } finally {
      setBusyId(undefined);
    }
  }

  async function handleToggleActive(user: PlatformUser) {
    setBusyId(user.id);
    try {
      await adminService.users.setActive(user.id, !user.active);
      setActionError(undefined);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update user status');
    } finally {
      setBusyId(undefined);
    }
  }

  const columns: Column<PlatformUser>[] = [
    {
      key: 'name',
      header: 'User',
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.name} size={32} color={u.avatarColor} />
          <div>
            <div className="font-semibold text-ink">{u.name}</div>
            <div className="text-caption text-ink-soft">{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      width: '180px',
      render: (u) => (
        <Select
          value={u.role}
          onChange={(v) => handleRoleChange(u, v as Role)}
          options={roleOptions}
        />
      ),
    },
    {
      key: 'active',
      header: 'Status',
      width: '110px',
      render: (u) => <StatusPill label={u.active ? 'Active' : 'Inactive'} status={u.active ? 'success' : 'neutral'} />,
    },
    {
      key: 'actions',
      header: '',
      width: '140px',
      render: (u) => (
        <div className="flex justify-end">
          <Button
            label={u.active ? 'Deactivate' : 'Activate'}
            variant={u.active ? 'outline' : 'primary'}
            size="sm"
            loading={busyId === u.id}
            onClick={() => handleToggleActive(u)}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Users & Roles" subtitle={rows ? `${rows.length} users` : undefined} />

      {actionError && (
        <div className="mb-4">
          <Banner tone="danger" title="Can't change this user" message={actionError} />
        </div>
      )}

      <div className="mb-4 flex gap-3">
        <SearchBar value={q} onChangeText={setQ} placeholder="Search by name, email…" />
        <Select
          value={roleFilter}
          onChange={(v) => setRoleFilter(v as Role | '')}
          options={roleFilterOptions}
          className="max-w-[180px]"
        />
      </div>

      {loading ? (
        <Loading />
      ) : !rows || rows.length === 0 ? (
        <EmptyState icon="people" title="No users found" />
      ) : (
        <Table columns={columns} rows={rows} />
      )}
    </div>
  );
}
