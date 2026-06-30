import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Strain } from './entities/strain';
import { StrainHunterController } from './strain-hunter.controller';
import { StrainHunterService } from './strain-hunter.service';
import { GeneticsModule } from '../genetics/genetics.module';
import { TerpeneModule } from '../terpene/terpene.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Strain]),
    GeneticsModule,
    TerpeneModule,
  ],
  controllers: [StrainHunterController],
  providers: [StrainHunterService],
  exports: [StrainHunterService],
})
export class StrainHunterModule { }