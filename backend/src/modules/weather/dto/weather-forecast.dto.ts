import { ApiProperty } from '@nestjs/swagger';
import { WeatherForecastDayDto } from './weather-forecast-day.dto';

export class WeatherForecastDto {
  @ApiProperty({ description: 'Requested city or location.', example: 'Tel Aviv' })
  city!: string;

  @ApiProperty({
    description: 'Five-day forecast entries.',
    type: [WeatherForecastDayDto],
  })
  forecast!: WeatherForecastDayDto[];
}
