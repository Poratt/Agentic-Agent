import { ApiProperty } from '@nestjs/swagger';

export class WeatherCurrentDto {
  @ApiProperty({ description: 'Current temperature in Celsius.', example: '28' })
  tempC!: string;

  @ApiProperty({ description: 'Current temperature in Fahrenheit.', example: '82' })
  tempF!: string;

  @ApiProperty({ description: 'Feels-like temperature in Celsius.', example: '30' })
  feelsLikeC!: string;

  @ApiProperty({ description: 'Feels-like temperature in Fahrenheit.', example: '86' })
  feelsLikeF!: string;

  @ApiProperty({ description: 'Current humidity percentage.', example: '61' })
  humidity!: string;

  @ApiProperty({ description: 'Human-readable weather description.', example: 'Partly cloudy' })
  description!: string;

  @ApiProperty({ description: 'Backward-compatible wind speed alias in kilometers per hour.', example: '13' })
  windSpeed!: string;

  @ApiProperty({ description: 'Wind speed in kilometers per hour.', example: '13' })
  windSpeedKmph!: string;

  @ApiProperty({ description: 'Wind speed in miles per hour.', example: '8' })
  windSpeedMiles!: string;

  @ApiProperty({ description: 'Wind direction as a 16-point compass value.', example: 'NW' })
  windDirection!: string;

  @ApiProperty({ description: 'Wind direction in degrees.', example: '315' })
  windDegree!: string;

  @ApiProperty({ description: 'Atmospheric pressure in millibars.', example: '1012' })
  pressure!: string;

  @ApiProperty({ description: 'Atmospheric pressure in inches.', example: '30' })
  pressureInches!: string;

  @ApiProperty({ description: 'Visibility in kilometers.', example: '10' })
  visibility!: string;

  @ApiProperty({ description: 'Visibility in miles.', example: '6' })
  visibilityMiles!: string;

  @ApiProperty({ description: 'Cloud cover percentage.', example: '25' })
  cloudCover!: string;

  @ApiProperty({ description: 'UV index.', example: '7' })
  uvIndex!: string;

  @ApiProperty({ description: 'Precipitation in millimeters.', example: '0.0' })
  precipitationMm!: string;

  @ApiProperty({ description: 'Precipitation in inches.', example: '0.0' })
  precipitationInches!: string;

  @ApiProperty({ description: 'Observation time reported by the weather provider.', example: '09:45 AM' })
  observationTime!: string;

  @ApiProperty({ description: 'Weather condition code from the provider.', example: '116' })
  weatherCode!: string;
}
