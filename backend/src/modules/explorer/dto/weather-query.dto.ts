// FILE: src/modules/explorer/dto/weather-query.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class WeatherQueryDto {
    @ApiProperty({
        description: 'The city or location to check the weather for (e.g. Tel Aviv, London).',
        example: 'Tel Aviv',
    })
    @IsString()
    @IsNotEmpty()
    city!: string;
}