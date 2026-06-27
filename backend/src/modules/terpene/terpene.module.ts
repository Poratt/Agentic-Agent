import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Terpene } from './entities/terpene.entity';
import { TerpeneService } from './terpene.service';
import { TerpeneController } from './terpene.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Terpene])],
    controllers: [TerpeneController],
    providers: [TerpeneService],
    exports: [TerpeneService],
})
export class TerpeneModule {}