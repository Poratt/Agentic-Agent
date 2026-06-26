import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Strain } from './entities/strain';
import { StrainHunterController } from './strain-hunter.controller';
import { StrainHunterService } from './strain-hunter.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Strain]),
  ],
  controllers: [StrainHunterController],
  providers: [StrainHunterService],
  exports: [StrainHunterService],
})
export class StrainHunterModule { }