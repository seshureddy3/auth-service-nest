import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AcceptInvitationDto {
  @IsString({ message: 'Invitation token must be a valid text string.' })
  @IsNotEmpty({ message: 'Invitation token is required.' })
  token!: string;

  @IsString({ message: 'Password must be a text string.' })
  @IsNotEmpty({ message: 'Password cannot be blank.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @MaxLength(100, { message: 'Password cannot exceed 100 characters.' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_])[A-Za-z\d@$!%*?&_]{8,}$/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
    },
  )
  password!: string;
}
