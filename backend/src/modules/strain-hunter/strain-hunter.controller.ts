import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { CustomApiOperationOptions } from '../../core/types/custom-api-operation-options.type';
import { StrainHunterFetchResponseDto } from './dto/strain-hunter-fetch-response.dto';
import { StrainHunterService } from './strain-hunter.service';

@ApiTags('strain-hunter')
@ApiBearerAuth()
@Controller('strain-hunter')
export class StrainHunterController {
  constructor(private readonly strainHunterService: StrainHunterService) { }

  @Get('fetch')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Fetch configured strain hunter strain data',
    summaryHe: 'בודק זנים..',
    toolIcon: 'ph-compass',
    description:
      'Uses the configured Jane store page scraper or local database cache to load and return normalized strain item data.',
  } as CustomApiOperationOptions)
  @ApiQuery({
    name: 'forceRefresh',
    required: false,
    type: Boolean,
    description: 'Whether to force refresh and scrape new data, overwriting local database records.',
  })
  @ApiOkResponse({
    description: 'Strain hunter items fetched and normalized successfully.',
    type: StrainHunterFetchResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The configured Jane source could not be fetched.' })
  @ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  fetchData(@Query('forceRefresh') forceRefresh?: string) {
    const isForce = forceRefresh === 'true';
    return this.strainHunterService.fetchData(isForce);
  }
}