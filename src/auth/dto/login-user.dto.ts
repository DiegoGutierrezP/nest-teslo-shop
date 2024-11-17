import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginUserDto {

    @ApiProperty({
        description: 'user email',
    })
    @IsString()
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'user password'
    })
    @IsString()
    @MinLength(6)
    password: string;
}