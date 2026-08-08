import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class AdminRegisterDto {
  @IsString({ message: 'Name must be a text string.' })
  @IsNotEmpty({ message: 'Name cannot be blank.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(3, { message: 'Name must be at least 3 characters long.' })
  @MaxLength(50, { message: 'Name cannot exceed 50 characters.' })
  name!: string;

  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty({ message: 'Email cannot be blank.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @IsNotEmpty({
    message: 'A user role must be explicitly specified by the admin.',
  })
  @IsEnum(UserRole, { message: 'Please provide a valid user role.' })
  role!: UserRole;
}
