import { ApiProperty } from '@nestjs/swagger';
import { BusinessIdea } from '../interfaces/idea.interface';

export class BusinessIdeaDto implements BusinessIdea {
  @ApiProperty({ description: 'שם הרעיון' })
  title!: string;

  @ApiProperty({ description: 'תיאור קצר' })
  description!: string;

  @ApiProperty({ description: 'קהל יעד' })
  targetMarket!: string;

  @ApiProperty({ description: 'ציון אימות 1–10', minimum: 1, maximum: 10 })
  validationScore!: number;

  @ApiProperty({ description: 'הסבר קצר בעברית' })
  validationReason!: string;

  @ApiProperty({ type: [String], description: 'סיכונים' })
  risks!: string[];

  @ApiProperty({ type: [String], description: 'מתחרים שנמצאו' })
  competitors!: string[];

  @ApiProperty({ type: [String], description: 'צעדים הבאים' })
  nextSteps!: string[];

  @ApiProperty({ type: [String], description: 'סיגנלים שעליהם הרעיון מבוסס' })
  signalsReferenced!: string[];

  @ApiProperty({ description: 'האם הרעיון מעוגן במחקר שוק' })
  groundedInSignals!: boolean;
}

export class GenerateIdeasResponseDto {
  @ApiProperty({ description: 'הצלחה' })
  success!: boolean;

  @ApiProperty({ description: 'הודעה' })
  message!: string;

  @ApiProperty({ description: 'האם חלק מהרעיונות נכשלו' })
  partial!: boolean;

  @ApiProperty({ type: [BusinessIdeaDto] })
  result!: BusinessIdeaDto[];

  @ApiProperty({ description: 'מספר רעיונות שנכשלו (רק כש-partial)', required: false })
  failedCount?: number;
}
