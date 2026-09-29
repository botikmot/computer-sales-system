import { UserRole, UserStatus } from '@computer-sales/database';

export type AuthenticatedUser = {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  branchId: string | null;
  branch: {
    id: string;
    name: string;
  } | null;
};
