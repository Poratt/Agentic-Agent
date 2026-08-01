import {
    IsObject,
    IsOptional,
    ValidateNested,
    Validate,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    ValidationArguments,
    IsNumber,
    Min,
    Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const VALID_PREF_STATES = ['neutral', 'like', 'love', 'avoid'] as const;

@ValidatorConstraint({ name: 'ValidPrefValues', async: false })
class ValidPrefValuesConstraint implements ValidatorConstraintInterface {
    validate(value: Record<string, unknown>): boolean {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return false;
        }

        return Object.values(value).every(
            (state) => typeof state === 'string' && (VALID_PREF_STATES as readonly string[]).includes(state),
        );
    }

    defaultMessage(_args: ValidationArguments): string {
        return `prefs values must be one of: ${VALID_PREF_STATES.join(', ')}`;
    }
}

@ValidatorConstraint({ name: 'WeightsSumTo100', async: false })
class WeightsSumTo100Constraint implements ValidatorConstraintInterface {
    validate(value: { terpene?: number; genetics?: number }): boolean {
        if (typeof value !== 'object' || value === null) {
            return false;
        }

        const { terpene, genetics } = value;
        if (typeof terpene !== 'number' || typeof genetics !== 'number') {
            return false;
        }

        return terpene + genetics === 100;
    }

    defaultMessage(_args: ValidationArguments): string {
        return 'terpene and genetics weights must sum to 100';
    }
}

class WeightsDto {
    @ApiPropertyOptional({ description: 'Terpene weight (0-100).', example: 60 })
    @IsNumber()
    @Min(0)
    @Max(100)
    terpene!: number;

    @ApiPropertyOptional({ description: 'Genetics weight (0-100). Must sum to 100 with terpene.', example: 40 })
    @IsNumber()
    @Min(0)
    @Max(100)
    genetics!: number;
}

export class UpdateMatchingPreferencesDto {
    @ApiPropertyOptional({
        description: 'Dynamic map of preference keys to states. Keys follow the pattern "category:name" (e.g. "terpene:Myrcene"). Values must be one of: neutral, like, love, avoid.',
        example: { 'terpene:Myrcene': 'like', 'genetics:GG4': 'love' },
    })
    @IsOptional()
    @IsObject()
    @Validate(ValidPrefValuesConstraint)
    prefs?: Record<string, string>;

    @ApiPropertyOptional({
        description: 'Weight configuration for scoring. terpene and genetics must be numbers between 0 and 100 that sum to 100.',
        type: WeightsDto,
    })
    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => WeightsDto)
    @Validate(WeightsSumTo100Constraint)
    weights?: WeightsDto;
}
