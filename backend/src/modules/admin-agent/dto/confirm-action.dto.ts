import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class ConfirmActionDto {
  @ApiProperty({ description: 'The pending action ID from the confirmation event' })
  @IsString()
  @IsNotEmpty()
  actionId!: string;

  @ApiProperty({ description: 'true to confirm, false to cancel' })
  @IsBoolean()
  confirmed!: boolean;
}
