import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateEventDto {
    @ApiProperty({ description: 'Google Calendar event ID to update' })
    @IsString()
    @IsNotEmpty()
    eventId: string;

    @ApiPropertyOptional({ description: 'New event summary/title' })
    @IsString()
    @IsOptional()
    summary?: string;

    @ApiPropertyOptional({ description: 'New start time (ISO 8601)' })
    @IsString()
    @IsOptional()
    startTime?: string;

    @ApiPropertyOptional({ description: 'New end time (ISO 8601)' })
    @IsString()
    @IsOptional()
    endTime?: string;

    @ApiPropertyOptional({ description: 'New event description' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ description: 'New event location' })
    @IsString()
    @IsOptional()
    location?: string;
}
