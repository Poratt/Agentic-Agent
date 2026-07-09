import { Module } from '@nestjs/common';
import { DatabaseMonitorController } from './database-monitor.controller';
import { DatabaseMonitorService } from './database-monitor.service';

@Module({
  controllers: [DatabaseMonitorController],
  providers: [DatabaseMonitorService],
  exports: [DatabaseMonitorService],
})
export class DatabaseMonitorModule {}
