import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';

export const ROLE_KEY = 'roles';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLE_KEY, roles);
