import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { CustomApiOperationOptions } from '../../core/types/custom-api-operation-options.type';
import { ExplorerFetchResponseDto } from './dto/explorer-fetch-response.dto';
import { ExplorerService } from './explorer.service';

@ApiTags('explorer')
@ApiBearerAuth()
@Controller('explorer')
export class ExplorerController {
  constructor(private readonly explorerService: ExplorerService) {}

  @Get('fetch')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Fetch configured explorer strain data',
    summaryHe: 'שולף את נתוני הזנים ממקור האקספלורר הקבוע בשרת',
    toolIcon: 'ph-compass',
    description:
      'Uses the configured Jane store page scraper to load and return normalized strain item data.',
  } as CustomApiOperationOptions)
  @ApiOkResponse({
    description: 'Explorer items fetched and normalized successfully.',
    type: ExplorerFetchResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The configured Jane source could not be fetched.' })
  @ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  fetchData() {
    return this.explorerService.fetchData();
  }
}
