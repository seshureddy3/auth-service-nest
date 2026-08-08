import { Exclude, Expose, Type } from 'class-transformer';
import { UserProfileDto } from './user-profile.dto';

@Exclude()
export class AuthPayloadDto {
  @Expose()
  accessToken!: string;

  @Expose()
  refreshToken!: string;

  @Expose()
  @Type(() => UserProfileDto)
  user!: UserProfileDto;
}
