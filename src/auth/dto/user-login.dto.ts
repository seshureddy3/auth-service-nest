import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Length,
  ValidateIf,
} from 'class-validator';

export enum LoginStrategy {
  PASSWORD = 'password',
  OTP = 'otp',
}

export class UserLoginDto {
  @IsEmail({}, { message: 'Please provide a valid email' })
  @IsNotEmpty({ message: 'Email cannot be blank' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @IsNotEmpty({ message: 'Login strategy choice is required' })
  @IsEnum(LoginStrategy, { message: 'Strategy must be either password or otp' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  strategy!: LoginStrategy;

  @ValidateIf((o) => o.strategy === LoginStrategy.PASSWORD)
  @IsString({ message: 'Password must be a valid string text' })
  @IsNotEmpty({ message: 'Password cannot be blank' })
  password?: string;

  @ValidateIf((o) => o.strategy === LoginStrategy.OTP)
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp?: string;
}
