import { UserRole } from '../../shared/constants/roles';

export interface UserProps {
  id?: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  isActive?: boolean;
  verificationCode?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}