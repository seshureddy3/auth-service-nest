import { IsNotEmpty, IsString } from "class-validator";

export class UserDeleteDto {
    @IsString({message: 'Password must be a valid text string'})
    @IsNotEmpty({message: `Password confirmation is required to delete you account!`})
    password!: string;
}