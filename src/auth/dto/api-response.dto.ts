import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ApiResponseDto<T> {
  @Expose()
  success!: boolean;

  @Expose()
  message!: string;

  @Expose()
  accessToken?: string;

  @Expose()
  refreshToken?: string;

  @Expose()
  data?: T;

  constructor(partial: Partial<ApiResponseDto<T>>) {
    Object.assign(this, partial);
  }
}
