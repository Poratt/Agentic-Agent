import { Controller, Get, Param, Post, Patch, Body, UseGuards } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiInternalServerErrorResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
    ApiUnauthorizedResponse,
    ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { CustomApiOperationOptions } from '../../core/types/custom-api-operation-options.type';
import { TerpeneService } from './terpene.service';
import { TerpeneListResultResponseDto } from './dto/terpene-list-result-response.dto';
import { TerpeneResultResponseDto } from './dto/terpene-result-response.dto';
import { TerpeneCreateDto } from './dto/terpene-create.dto';
import { TerpeneUpdateDto } from './dto/terpene-update.dto';

/**
 * Controller for the terpene reference catalog.
 *
 * Base path: /terpenes
 *
 * Endpoints summary:
 *
 * | Method | Path             | Description                              | Guard         |
 * | ------ | ---------------- | ---------------------------------------- | ------------- |
 * | GET    | /terpenes        | Return every terpene in the catalog.     | JwtAuthGuard  |
 * | GET    | /terpenes/:name  | Look up a single terpene by Hebrew name. | JwtAuthGuard  |
 */
@ApiTags('terpenes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('terpenes')
export class TerpeneController {
    constructor(private readonly terpeneService: TerpeneService) {}

    /**
     * Return every terpene in the catalog.
     *
     * Wrapped in `ServiceResultContainer<TerpeneDto[]>`. Used by the
     * `MatchingPreferencesDrawer` to populate hover-tooltip details.
     *
     * @returns ServiceResultContainer whose `result` is the alphabetically-ordered terpene list.
     * @throws 401 if the caller has no valid JWT.
     * @throws 500 on unexpected database or server failure.
     */
    @Get()
    @ApiOperation({
        summary: 'List all terpenes',
        summaryHe: 'שליפת כל הטרפנים בקטלוג',
        toolIcon: 'ph-flower-lotus',
        description:
            'Returns the full terpene reference catalog ordered alphabetically by Hebrew name. The list is small (~17 rows) and intended to be cached client-side.',
    } as CustomApiOperationOptions)
    @ApiOkResponse({
        description:
            'Catalog fetched successfully. `result` is an array of TerpeneDto ordered alphabetically by name.',
        type: TerpeneListResultResponseDto,
    })
    @ApiBadRequestResponse({ description: 'Not applicable for this endpoint.' })
    @ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
    @ApiForbiddenResponse({ description: 'Not applicable for this endpoint.' })
    @ApiNotFoundResponse({ description: 'Not applicable for this endpoint.' })
    @ApiInternalServerErrorResponse({ description: 'Unexpected database or server error.' })
    async findAll(): Promise<TerpeneListResultResponseDto> {
        const items = await this.terpeneService.findAll();
        return {
            success: true,
            message: 'Terpenes fetched successfully',
            result: items.map(item => ({
                id: item.id,
                name: item.name,
                description: item.description ?? undefined,
                scent: item.scent ?? undefined,
                effects: item.effects ?? undefined,
                color: item.color,
            })),
        };
    }

    /**
     * Look up a single terpene by its unique Hebrew name.
     *
     * @param name Hebrew name as stored in the `terpene.name` column. The match is exact.
     * @returns ServiceResultContainer whose `result` is the matching terpene, or null when no row exists.
     * @throws 401 if the caller has no valid JWT.
     * @throws 500 on unexpected database or server failure.
     */
    @Get(':name')
    @ApiOperation({
        summary: 'Get a terpene by name',
        summaryHe: 'שליפת טרפן בודד לפי שם',
        toolIcon: 'ph-flower-lotus',
        description:
            'Returns the terpene whose `name` column exactly matches the supplied `:name` path parameter. Result is `null` when no record matches — this is not treated as a 404 so the frontend can render a graceful empty state.',
    } as CustomApiOperationOptions)
    @ApiParam({
        name: 'name',
        type: String,
        description: 'Hebrew terpene name. Must exactly match the `terpene.name` column.',
        example: 'מירצן',
    })
    @ApiOkResponse({
        description:
            'Lookup succeeded. `result` is the matching terpene or null when no row matches the given name.',
        type: TerpeneResultResponseDto,
    })
    @ApiBadRequestResponse({ description: 'Not applicable for this endpoint.' })
    @ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
    @ApiForbiddenResponse({ description: 'Not applicable for this endpoint.' })
    @ApiNotFoundResponse({ description: 'Not applicable for this endpoint. Missing rows return `result: null`.' })
    @ApiInternalServerErrorResponse({ description: 'Unexpected database or server error.' })
    async findOne(@Param('name') name: string): Promise<TerpeneResultResponseDto> {
        const item = await this.terpeneService.findByName(name);
        if (!item) {
            return {
                success: true,
                message: 'No terpene matches the given name',
                result: null,
            };
        }
        return {
            success: true,
            message: 'Terpene fetched successfully',
            result: {
                id: item.id,
                name: item.name,
                description: item.description ?? undefined,
                scent: item.scent ?? undefined,
                effects: item.effects ?? undefined,
                color: item.color,
            },
        };
    }
}