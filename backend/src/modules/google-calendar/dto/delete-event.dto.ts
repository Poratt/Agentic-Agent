import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class DeleteEventDto {
    @ApiProperty({ description: 'Google OAuth refresh token' })
    @IsString()
    @IsNotEmpty()
    refreshToken: string;

    @ApiProperty({ description: 'Google Calendar event ID to delete' })
    @IsString()
    @IsNotEmpty()
    eventId: string;
}
