import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LlmHealthService } from './llm-health.service';
import { LlmProviderService } from '../../llm-provider/llm-provider.service';

@Injectable()
export class LlmTasksService {
    private readonly logger = new Logger(LlmTasksService.name);

    constructor(
        private readonly healthService: LlmHealthService,
        private readonly providerService: LlmProviderService,
    ) { }

    // 🚀 הרצה כל שעתיים 🚀
    @Cron('0 0 */2 * * *')
    async handleNightlyLlmHealthCheck() {
        this.logger.log('--- Starting Nightly LLM Auto-Health Check Cron Job ---');

        try {
            // מריץ את בדיקת הבריאות לכל המודלים הפעילים ב-DB (ששומרת אוטומטית לטבלה החדשה שלנו!)
            const result = await this.healthService.testAllModels();

            this.logger.log(
                `Nightly LLM Health Check finished successfully. Tested ${result.result?.length ?? 0} models.`,
            );
        } catch (error) {
            this.logger.error('Error occurred during Nightly LLM Health Check Cron Job', error);
        }
    }

    // 💡 בונוס לפיתוח: בדיקה קטנה שרצה כל שעה בדקה 30 (לא בדקה 0 כדי לא להתנגש עם nightly check בשעות 0, 3, 6, 9) 💡
    @Cron('0 30 * * * *') // runs every hour at minute 30
    async runIntermittentCheck() {
        this.logger.log('Intermittent LLM health validation is active.');
    }

    // 🚀 ניקוי יומי של תוצאות בדיקות מודלים ישנות מ-30 יום — רץ כל יום ב-03:00 🚀
    @Cron('0 0 3 * * *')
    async cleanupOldLlmModelTestResults() {
        this.logger.log('--- Starting LLM Model Test Results Retention Cleanup ---');
        try {
            const retentionDays = 30;
            const deletedCount = await this.providerService.deleteOldTestResults(retentionDays);
            this.logger.log(
                `LLM Model Test Results Retention Cleanup finished. Deleted ${deletedCount} rows older than ${retentionDays} days.`,
            );
        } catch (error) {
            this.logger.error('Error occurred during LLM Model Test Results Retention Cleanup', error);
        }
    }
}
