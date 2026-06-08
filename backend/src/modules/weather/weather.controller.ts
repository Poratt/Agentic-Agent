import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { GenUiSpec } from '../admin-agent/constants/gen-ui-spec.constant';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { CustomApiOperationOptions } from '../../core/types/custom-api-operation-options.type';
import { WeatherQueryDto } from './dto/weather-query.dto';
import { WeatherService } from './weather.service';

@ApiTags('weather')
@ApiBearerAuth()
@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) { }

  @Get('current')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get current weather for a location',
    summaryHe: 'בודק את מזג האוויר הנוכחי במיקום או בעיר מסוימת בעולם',
    toolIcon: 'ph-cloud-sun',
    description: 'Queries an external weather service to retrieve dynamic real-time conditions.',
    genUiSpec: GenUiSpec.WEATHER_CURRENT,
  } as CustomApiOperationOptions)
  @ApiQuery({
    name: 'city',
    required: true,
    type: String,
    description: 'The city or location to check the weather for (e.g. Tel Aviv, London).',
  })
  @ApiOkResponse({
    description: 'Weather data retrieved successfully.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  getWeather(@Query() query: WeatherQueryDto) {
    return this.weatherService.getWeather(query.city);
  }

  @Get('forecast')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get 5-day weather forecast',
    summaryHe: 'בודק את תחזית מזג האוויר ל-5 הימים הקרובים',
    toolIcon: 'ph-calendar-days',
    description: 'Retrieves a five-day forecast metrics grid for a specific city.',
    genUiSpec: GenUiSpec.WEATHER_FORECAST,
  } as CustomApiOperationOptions)
  @ApiQuery({
    name: 'city',
    required: true,
    type: String,
    description: 'The city or location to check the weather for (e.g. Tel Aviv, London).',
  })
  @ApiOkResponse({
    description: '5-day weather forecast retrieved successfully.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  getForecast(@Query() query: WeatherQueryDto) {
    return this.weatherService.getFiveDayForecast(query.city);
  }
}
