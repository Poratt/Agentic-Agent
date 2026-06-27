import { ApiProperty } from '@nestjs/swagger';
import { ServiceResultContainer } from '../../../core/models/service-result-container.model';
import { GeneticsDto } from './genetics.dto';

/**
 * Response wrapper for `GET /genetics/:name`.
 *
 * Result is a single genetics row (or `null` if no record matches the given name).
 */
export class GeneticsResultResponseDto implements ServiceResultContainer<GeneticsDto | null> {
    @ApiProperty({ description: 'Whether the request succeeded.', example: true })
    success!: boolean;

    @ApiProperty({ description: 'Human-readable status message.', example: 'OK' })
    message!: string;

    @ApiProperty({
        description: 'The matching genetics row, or null when no record matches the given name.',
        type: GeneticsDto,
        nullable: true,
    })
    result!: GeneticsDto | null;

    @ApiProperty({ description: 'Optional error details.', required: false, type: [String] })
    error?: string[];

    @ApiProperty({ description: 'Optional retry hint.', required: false })
    retryAfter?: string;

    @ApiProperty({ description: 'HTTP status code echoed from the server.', example: 200, required: false })
    statusCode?: number;
}
