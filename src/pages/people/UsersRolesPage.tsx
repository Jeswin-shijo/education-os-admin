import { useState } from 'react';
import { adminService } from '../../services';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { useToast } from '../../state/ToastContext';
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
  Loading,
  EmptyState,
  Pagination,
} from '../../components';

const ROLES: Role[] = ['student', 'faculty', 'hod', 'principal', 'admin'];

const roleOptions = ROLES.map((r) => ({ label: r.charAt(0).toUpperCase() + r.slice(1), value: r }));

const roleFilterOptions = [{ label: 'All roles', value: '' }, ...roleOptions];

export function UsersRolesPage() {
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const { rows, pagination, page, setPage, loading, reload } = usePaginatedList(
    (p) => adminService.users.listPage(q, roleFilter || undefined, p),
    [q, roleFilter],
  );

  const [busyId, setBusyId] = useState<string>();
  const toast = useToast();

  async function handleRoleChange(user: PlatformUser, role: Role) {
    setBusyId(user.id);
    try {
      await adminService.users.updateRole(user.id, role);
      reload();
      toast.success('Role updated', user.name);
    } catch (err) {
      toast.error('Could not change role', err instanceof Error ? err.message : undefined);
    } finally {
      setBusyId(undefined);
    }
  }

  async function handleToggleActive(user: PlatformUser) {
    setBusyId(user.id);
    const nowActive = !user.active;
    try {
      await adminService.users.setActive(user.id, nowActive);
      reload();
      toast.success(nowActive ? 'User activated' : 'User deactivated', user.name);
    } catch (err) {
      toast.error('Could not update user status', err instanceof Error ? err.message : undefined);
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
      ) : rows.length === 0 ? (
        <EmptyState icon="people" title="No users found" />
      ) : (
        <>
          <Table columns={columns} rows={rows} />
          <Pagination page={page} totalPages={pagination.totalPages} count={pagination.count} limit={pagination.limit} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
