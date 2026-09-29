import { useAuth } from '../context/AuthContext';

/**
 * useBranchScope hook
 * NOTE: This is UI-level guard only. Real enforcement happens in Go Fiber backend.
 * 
 * - SUPER_ADMIN: returns null (unrestricted global scope, can filter any branch)
 * - SUPERVISOR: returns user.branchId (strictly locked to supervisor's branch)
 * - EMPLOYEE: returns user.employeeId (strictly scoped to personal records)
 */
export function useBranchScope() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === 'SUPER_ADMIN') return null; // no filter = all branches
  if (user.role === 'SUPERVISOR') return user.branchId;
  if (user.role === 'EMPLOYEE') return user.employeeId;
  return null;
}

export default useBranchScope;
