import { Exclude, Expose, Type } from 'class-transformer';
import { UserRole, UserStatus } from '../entities/user.entity';

@Exclude()
export class UserProfileDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  email!: string;

  @Expose()
  role!: UserRole;

  @Expose()
  status!: UserStatus;

  @Expose()
  @Type(() => Date)
  createdAt!: Date;
}
