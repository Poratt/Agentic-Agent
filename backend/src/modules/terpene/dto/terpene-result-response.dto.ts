import { ApiProperty } from '@nestjs/swagger';
import { ServiceResultContainer } from '../../../core/models/service-result-container.model';
import { TerpeneDto } from './terpene.dto';

/**
 * Response wrapper for `GET /terpenes/:name`.
 *
 * Result is a single terpene (or `null` if no record matches the given name).
 */
export class TerpeneResultResponseDto implements ServiceResultContainer<TerpeneDto | null> {
    @ApiProperty({ description: 'Whether the request succeeded.', example: true })
    success!: boolean;

    @ApiProperty({ description: 'Human-readable status message.', example: 'OK' })
    message!: string;

    @ApiProperty({
        description: 'The matching terpene, or null when no record matches the given name.',
        type: TerpeneDto,
        nullable: true,
    })
    result!: TerpeneDto | null;

    @ApiProperty({ description: 'Optional error details.', required: false, type: [String] })
    error?: string[];

    @ApiProperty({ description: 'Optional retry hint.', required: false })
    retryAfter?: string;

    @ApiProperty({ description: 'HTTP status code echoed from the server.', example: 200, required: false })
    statusCode?: number;
}