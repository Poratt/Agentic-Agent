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
import { GENUI_HTML } from '../admin-agent/constants/agent-instructions.constant';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { CustomApiOperationOptions } from '../../core/types/custom-api-operation-options.type';
import { WeatherQueryDto } from './dto/weather-query.dto';
import { WeatherService } from './weather.service';

@ApiTags('weather')
@ApiBearerAuth()
@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get('current')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get current weather for a location',
    summaryHe: 'בודק את מזג האוויר הנוכחי במיקום או בעיר מסוימת בעולם',
    toolIcon: 'ph-cloud-sun',
    description: 'Queries an external weather service to retrieve dynamic real-time conditions.',
    agentInstruction: GENUI_HTML(
      'ALWAYS render a weather card. Render a weather card with emoji and temperature. ' +
        'Regardless of how the user asked - always return the HTML component, never plain text.',
    ),
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
    agentInstruction: GENUI_HTML(
      `Render a gorgeous 5-day forecast container.
Requirements:
1. Header: Render the city name prominently with a small calendar icon.
2. Grid Layout: Display 5 cards horizontally on desktop (flexbox or grid with 5 columns) and stacked on mobile.
3. Card Details: Each of the 5 cards represents a day and MUST display:
   - The Day name (e.g. "יום ראשון", "יום שני") in bold.
   - A large weather emoji centered (☀️, 🌧️, etc.) with transition scale hover effect.
   - Temperature range: Max temp in red/orange, Min temp in light blue/secondary text.
   - A small humidity line: "לחות: X%".
4. Colors & Fonts: Use var(--color-primary), var(--color-surface), and var(--color-text-primary).
5. Hover Effects: All 5 cards must raise up slightly and change border colors on mouseover.`,
    ),
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
