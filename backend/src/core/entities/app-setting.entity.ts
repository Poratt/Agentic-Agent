import { Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity({ name: 'app_settings' })
export class AppSetting {
  @ApiProperty({ description: 'Unique identifier of the application setting', example: 1 })
  @PrimaryGeneratedColumn()
  id!: number;
}
