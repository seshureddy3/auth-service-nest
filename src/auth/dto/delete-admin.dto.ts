import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class AdminDeleteUserDTO {
  @IsString()
  @IsNotEmpty({ message: `Reason is required for audit tracking` })
  @MaxLength(255, { message: `Reason can't exceed 255 chars` })
  reason!: string;
}
