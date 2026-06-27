import { ApiProperty } from '@nestjs/swagger';
import { ServiceResultContainer } from '../../../core/models/service-result-container.model';
import { TerpeneDto } from './terpene.dto';

/**
 * Response wrapper for `GET /terpenes`.
 *
 * Result is the list of all terpenes ordered alphabetically by Hebrew name.
 * Wrapped in the project-standard `ServiceResultContainer<T>` envelope.
 */
export class TerpeneListResultResponseDto implements ServiceResultContainer<TerpeneDto[]> {
    @ApiProperty({ description: 'Whether the request succeeded.', example: true })
    success!: boolean;

    @ApiProperty({ description: 'Human-readable status message.', example: 'OK' })
    message!: string;

    @ApiProperty({
        description: 'The list of terpenes ordered alphabetically by name.',
        type: [TerpeneDto],
    })
    result!: TerpeneDto[];

    @ApiProperty({ description: 'Optional error details.', required: false, type: [String] })
    error?: string[];

    @ApiProperty({ description: 'Optional retry hint.', required: false })
    retryAfter?: string;

    @ApiProperty({ description: 'HTTP status code echoed from the server.', example: 200, required: false })
    statusCode?: number;
}