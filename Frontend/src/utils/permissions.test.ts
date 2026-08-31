import { getHomePathForRole, hasPermission, rolePermissions } from '../utils/permissions';

describe('getHomePathForRole', () => {
  it('sends staff to POS', () => {
    expect(getHomePathForRole('staff')).toBe('/pos');
  });

  it('sends admin and pharmacist to dashboard', () => {
    expect(getHomePathForRole('admin')).toBe('/');
    expect(getHomePathForRole('pharmacist')).toBe('/');
  });

  it('defaults unknown to dashboard', () => {
    expect(getHomePathForRole(undefined)).toBe('/');
    expect(getHomePathForRole(null)).toBe('/');
  });
});

describe('role permission matrix', () => {
  it('denies staff settings and prescriptions', () => {
    expect(hasPermission('staff', 'view_settings')).toBe(false);
    expect(hasPermission('staff', 'view_prescriptions')).toBe(false);
    expect(hasPermission('staff', 'create_sale')).toBe(true);
  });

  it('allows admin audit-related permissions', () => {
    expect(hasPermission('admin', 'view_settings')).toBe(true);
    expect(hasPermission('admin', 'view_users')).toBe(true);
  });

  it('does not give pharmacist medication write claims', () => {
    expect(hasPermission('pharmacist', 'add_medication')).toBe(false);
    expect(hasPermission('pharmacist', 'edit_medication')).toBe(false);
    expect(hasPermission('pharmacist', 'view_prescriptions')).toBe(true);
  });

  it('allows staff restock but not medication create', () => {
    expect(hasPermission('staff', 'create_restock')).toBe(true);
    expect(hasPermission('staff', 'view_restock')).toBe(true);
    expect(hasPermission('staff', 'add_medication')).toBe(false);
  });

  it('allows admin to add users', () => {
    expect(hasPermission('admin', 'add_user')).toBe(true);
    expect(hasPermission('pharmacist', 'add_user')).toBe(false);
  });
});
