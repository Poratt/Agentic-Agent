import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Genetics } from './entities/genetics.entity';
import { GeneticsService } from './genetics.service';
import { GeneticsController } from './genetics.controller';
import { LlmModule } from '../llm/llm.module';

@Module({
    imports: [TypeOrmModule.forFeature([Genetics]), LlmModule],
    controllers: [GeneticsController],
    providers: [GeneticsService],
    exports: [GeneticsService],
})
export class GeneticsModule {}
