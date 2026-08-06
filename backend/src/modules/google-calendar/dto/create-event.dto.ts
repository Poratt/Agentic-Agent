import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateEventDto {
    @ApiProperty({ description: 'Event summary/title' })
    @IsString()
    @IsNotEmpty()
    summary: string;

    @ApiProperty({ description: 'Event start time (ISO 8601)' })
    @IsString()
    @IsNotEmpty()
    startTime: string;

    @ApiProperty({ description: 'Event end time (ISO 8601)' })
    @IsString()
    @IsNotEmpty()
    endTime: string;

    @ApiPropertyOptional({ description: 'Event description' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ description: 'Event location' })
    @IsString()
    @IsOptional()
    location?: string;
}
