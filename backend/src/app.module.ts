import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AdminAgentModule } from './modules/admin-agent/admin-agent.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { CurrencyModule } from './modules/currency/currency.module';
import { LlmModule } from './modules/llm/llm.module';
import { SystemModule } from './modules/system/system.module';
import { WeatherModule } from './modules/weather/weather.module';
import { LlmProviderModule } from './modules/llm-provider/llm-provider.module';
import { ScheduleModule } from '@nestjs/schedule';
import { StrainHunterModule } from './modules/strain-hunter/strain-hunter.module';
import { TerpeneModule } from './modules/terpene/terpene.module';
import { GeneticsModule } from './modules/genetics/genetics.module';
import { WebSearchModule } from './modules/web-search/web-search.module';
import { CannlyticsModule } from './modules/cannlytics/cannlytics.module';
import { DatabaseMonitorModule } from './modules/database-monitor/database-monitor.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 3306),
        username: config.get('DB_USER', 'root'),
        password: config.get('DB_PASSWORD', 'password'),
        database: config.get('DB_NAME'),
        synchronize: true,
        autoLoadEntities: true,
      }),
    }),
    AuthModule,
    UsersModule,
    AdminAgentModule,
    AnalyticsModule,
    CurrencyModule,
    LlmModule,
    SystemModule,
    WeatherModule,
    LlmProviderModule,
    StrainHunterModule,
    TerpeneModule,
    GeneticsModule,
    WebSearchModule,
    CannlyticsModule,
    DatabaseMonitorModule
  ],
})
export class AppModule {


}
