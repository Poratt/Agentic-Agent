import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoogleCalendarController } from './google-calendar.controller';
import { GoogleCalendarService } from './google-calendar.service';
import { GoogleCalendarTokenEntity } from './entities/google-calendar-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GoogleCalendarTokenEntity])],
  controllers: [GoogleCalendarController],
  providers: [GoogleCalendarService],
  exports: [GoogleCalendarService],
})
export class GoogleCalendarModule {}
