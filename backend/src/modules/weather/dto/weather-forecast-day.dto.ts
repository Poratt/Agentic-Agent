import { ApiProperty } from '@nestjs/swagger';

export class WeatherForecastDayDto {
  @ApiProperty({ description: 'Forecast date in ISO format.', example: '2026-06-07' })
  date!: string;

  @ApiProperty({ description: 'Localized day name.', example: 'Sunday' })
  dayName!: string;

  @ApiProperty({ description: 'Maximum forecast temperature in Celsius.', example: 31 })
  tempMax!: number;

  @ApiProperty({ description: 'Minimum forecast temperature in Celsius.', example: 24 })
  tempMin!: number;

  @ApiProperty({ description: 'Weather emoji for display.', example: '☀️' })
  emoji!: string;

  @ApiProperty({ description: 'Localized weather description.', example: 'Sunny' })
  description!: string;

  @ApiProperty({ description: 'Forecast humidity percentage.', example: 62 })
  humidity!: number;
}
