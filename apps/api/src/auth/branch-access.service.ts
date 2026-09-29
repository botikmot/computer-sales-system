import { ForbiddenException, Injectable } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { AuthenticatedUser } from './types/authenticated-user.js';

@Injectable()
export class BranchAccessService {
  assertCanAccessBranch(user: AuthenticatedUser, branchId: string): void {
    // System-level ADMIN can access all branches.
    if (user.role === UserRole.ADMIN) {
      return;
    }

    // Every non-admin operational user must have a branch.
    if (!user.branchId) {
      throw new ForbiddenException('User is not assigned to a branch.');
    }

    // User can only access their assigned branch.
    if (user.branchId !== branchId) {
      throw new ForbiddenException('You do not have access to this branch.');
    }
  }

  assertCanAccessOptionalBranch(
    user: AuthenticatedUser,
    branchId?: string | null,
  ): void {
    // No branch filter supplied.
    // Non-admin users still need an assigned branch.
    if (!branchId) {
      if (user.role !== UserRole.ADMIN && !user.branchId) {
        throw new ForbiddenException('User is not assigned to a branch.');
      }

      return;
    }

    this.assertCanAccessBranch(user, branchId);
  }
}
