import { ApiProperty } from '@nestjs/swagger';
import { ServiceResultContainer } from '../../../core/models/service-result-container.model';
import { GeneticsDto } from './genetics.dto';

/**
 * Response wrapper for `GET /genetics`.
 *
 * Result is the list of all genetics rows ordered alphabetically by Hebrew name.
 * Wrapped in the project-standard `ServiceResultContainer<T>` envelope.
 */
export class GeneticsListResultResponseDto implements ServiceResultContainer<GeneticsDto[]> {
    @ApiProperty({ description: 'Whether the request succeeded.', example: true })
    success!: boolean;

    @ApiProperty({ description: 'Human-readable status message.', example: 'OK' })
    message!: string;

    @ApiProperty({
        description: 'The list of genetics rows ordered alphabetically by name.',
        type: [GeneticsDto],
    })
    result!: GeneticsDto[];

    @ApiProperty({ description: 'Optional error details.', required: false, type: [String] })
    error?: string[];

    @ApiProperty({ description: 'Optional retry hint.', required: false })
    retryAfter?: string;

    @ApiProperty({ description: 'HTTP status code echoed from the server.', example: 200, required: false })
    statusCode?: number;
}
