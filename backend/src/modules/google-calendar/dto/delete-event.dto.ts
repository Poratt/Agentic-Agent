import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class DeleteEventDto {
    @ApiProperty({ description: 'Google Calendar event ID to delete' })
    @IsString()
    @IsNotEmpty()
    eventId: string;
}
