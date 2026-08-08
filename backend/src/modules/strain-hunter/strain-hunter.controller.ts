import { Body, Controller, Get, Put, Query, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RequestWithUser } from '../../core/interfaces/request-with-user.interface';
import { CustomApiOperationOptions } from '../../core/types/custom-api-operation-options.type';
import { UpdateMatchingPreferencesDto } from './dto/matching-preferences.dto';
import { StrainHunterFetchResponseDto } from './dto/strain-hunter-fetch-response.dto';
import { StrainHunterService } from './strain-hunter.service';
import { UserRole } from '../../core/enums/user-role.enum';

@ApiTags('strain-hunter')
@ApiBearerAuth()
@Controller('strain-hunter')
export class StrainHunterController {
  constructor(private readonly strainHunterService: StrainHunterService) { }

  @Get('fetch')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Fetch configured strain hunter strain data',
    summaryHe: 'סורקים, מעדכנים ומציגים את מלאי הזנים הנוכחי',
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
  @ApiForbiddenResponse({ description: 'forceRefresh requires Admin role.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  fetchData(@Query('forceRefresh') forceRefresh: string | undefined, @Req() req: RequestWithUser) {
    const isForce = forceRefresh === 'true';
    if (isForce && req.user?.role !== UserRole.Admin) {
      throw new ForbiddenException('רענון נתונים כפוי מוגבל למנהלי מערכת');
    }
    return this.strainHunterService.fetchData(isForce);
  }

  @Get('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get authenticated user matching preferences',
    summaryHe: 'שולפים את הגדרות ההתאמה האישית השמורות שלך',
    toolIcon: 'ph-sliders',
    description: 'Returns the saved matching preferences (prefs map and weights) for the authenticated user. Returns defaults if no record exists.',
  } as CustomApiOperationOptions)
  @ApiOkResponse({
    description: 'User matching preferences retrieved successfully.',
    schema: {
      type: 'object',
      properties: {
        prefs: { type: 'object', description: 'Map of preference keys to states.' },
        weights: {
          type: 'object',
          properties: {
            terpene: { type: 'number', example: 60 },
            genetics: { type: 'number', example: 40 },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  getPreferences(@Req() req: RequestWithUser) {
    return this.strainHunterService.getPreferences(req.user!.sub);
  }

  @Put('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Upsert authenticated user matching preferences',
    summaryHe: 'שומרים או מעדכנים את הגדרות ההתאמה האישית שלך',
    toolIcon: 'ph-floppy-disk',
    description: 'Creates or updates the matching preferences for the authenticated user. Only the fields included in the request body will be updated.',
  } as CustomApiOperationOptions)
  @ApiBody({ type: UpdateMatchingPreferencesDto })
  @ApiOkResponse({
    description: 'User matching preferences saved successfully.',
    schema: {
      type: 'object',
      properties: {
        prefs: { type: 'object', description: 'Map of preference keys to states.' },
        weights: {
          type: 'object',
          properties: {
            terpene: { type: 'number', example: 60 },
            genetics: { type: 'number', example: 40 },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid preferences data.' })
  @ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  upsertPreferences(@Req() req: RequestWithUser, @Body() dto: UpdateMatchingPreferencesDto) {
    return this.strainHunterService.upsertPreferences(req.user!.sub, dto);
  }
}
