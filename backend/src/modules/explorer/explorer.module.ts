import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExplorerController } from './explorer.controller';
import { ExplorerService } from './explorer.service';
import { Strain } from './entities/strain';

@Module({
  imports: [
    TypeOrmModule.forFeature([Strain]),
  ],
  controllers: [ExplorerController],
  providers: [ExplorerService],
  exports: [ExplorerService],
})
export class ExplorerModule { }