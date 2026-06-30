import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiForbiddenResponse,
    ApiInternalServerErrorResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { CustomApiOperationOptions } from '../../core/types/custom-api-operation-options.type';
import { GeneticsService } from './genetics.service';
import { GeneticsListResultResponseDto } from './dto/genetics-list-result-response.dto';
import { GeneticsResultResponseDto } from './dto/genetics-result-response.dto';
import { GeneticsDto, toGeneticsDto } from './dto/genetics.dto';

/**
 * Controller for the genetics reference catalog.
 *
 * Base path: /genetics
 *
 * Endpoints summary:
 *
 * | Method | Path              | Description                                  | Guard         |
 * | ------ | ----------------- | -------------------------------------------- | ------------- |
 * | GET    | /genetics         | Return every strain in the catalog.          | JwtAuthGuard  |
 * | GET    | /genetics/:name   | Look up a single strain by Hebrew name.      | JwtAuthGuard  |
 */
@ApiTags('genetics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('genetics')
export class GeneticsController {
    constructor(private readonly geneticsService: GeneticsService) {}

    /**
     * Return every genetics row in the catalog.
     *
     * Wrapped in `ServiceResultContainer<GeneticsDto[]>`. Used by the
     * `MatchingPreferencesDrawer` to populate hover-tooltip details.
     *
     * @returns ServiceResultContainer whose `result` is the alphabetically-ordered genetics list.
     * @throws 401 if the caller has no valid JWT.
     * @throws 500 on unexpected database or server failure.
     */
    @Get()
    @ApiOperation({
        summary: 'List all genetics rows',
        summaryHe: 'שליפת כל הזנים בקטלוג',
        toolIcon: 'ph-tree-evergreen',
        description:
            'Returns the full genetics reference catalog ordered alphabetically by Hebrew name. The list is intended to be cached client-side.',
    } as CustomApiOperationOptions)
    @ApiOkResponse({
        description:
            'Catalog fetched successfully. `result` is an array of GeneticsDto ordered alphabetically by name.',
        type: GeneticsListResultResponseDto,
    })
    @ApiBadRequestResponse({ description: 'Not applicable for this endpoint.' })
    @ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
    @ApiForbiddenResponse({ description: 'Not applicable for this endpoint.' })
    @ApiNotFoundResponse({ description: 'Not applicable for this endpoint.' })
    @ApiInternalServerErrorResponse({ description: 'Unexpected database or server error.' })
    async findAll(): Promise<GeneticsListResultResponseDto> {
        const items = await this.geneticsService.findAll();
        return {
            success: true,
            message: 'Genetics fetched successfully',
            result: items.map((item): GeneticsDto => toGeneticsDto(item)!),
        };
    }

    /**
     * Look up a single genetics row by its unique Hebrew name.
     *
     * @param name Hebrew name as stored in the `genetics.name` column. The match is exact. Must be URL-encoded when it contains spaces or non-ASCII characters.
     * @returns ServiceResultContainer whose `result` is the matching genetics row, or null when no row exists.
     * @throws 401 if the caller has no valid JWT.
     * @throws 500 on unexpected database or server failure.
     */
    @Get(':name')
    @ApiOperation({
        summary: 'Get a strain by name',
        summaryHe: 'שליפת זן בודד לפי שם',
        toolIcon: 'ph-tree-evergreen',
        description:
            'Returns the genetics row whose `name` column exactly matches the supplied `:name` path parameter. Result is `null` when no record matches — this is not treated as a 404 so the frontend can render a graceful empty state.',
    } as CustomApiOperationOptions)
    @ApiParam({
        name: 'name',
        type: String,
        description:
            'Hebrew strain name. Must exactly match the `genetics.name` column. URL-encode spaces and non-ASCII characters (e.g. `גורילה%20גלו`).',
        example: 'גורילה גלו',
    })
    @ApiOkResponse({
        description:
            'Lookup succeeded. `result` is the matching strain or null when no row matches the given name.',
        type: GeneticsResultResponseDto,
    })
    @ApiBadRequestResponse({ description: 'Not applicable for this endpoint.' })
    @ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
    @ApiForbiddenResponse({ description: 'Not applicable for this endpoint.' })
    @ApiNotFoundResponse({ description: 'Not applicable for this endpoint. Missing rows return `result: null`.' })
    @ApiInternalServerErrorResponse({ description: 'Unexpected database or server error.' })
    async findOne(@Param('name') name: string): Promise<GeneticsResultResponseDto> {
        const item = await this.geneticsService.findByName(name);
        return {
            success: true,
            message: item ? 'Genetics fetched successfully' : 'No genetics row matches the given name',
            result: toGeneticsDto(item),
        };
    }
}
