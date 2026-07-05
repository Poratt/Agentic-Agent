import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CannlyticsService } from './cannlytics.service';

@Module({
    imports: [HttpModule],
    providers: [CannlyticsService],
    exports: [CannlyticsService],
})
export class CannlyticsModule {}
