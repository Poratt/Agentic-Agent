import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LlmHealthService } from './llm-health.service';

@Injectable()
export class LlmTasksService {
    private readonly logger = new Logger(LlmTasksService.name);

    constructor(private readonly healthService: LlmHealthService) { }

    // 🚀 הרצה כל לילה בין 00:00 ל-10:00 כל 3 שעות (00:00, 03:00, 06:00, 09:00) 🚀
    @Cron('0 0 0,3,6,9 * * *')
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

    // 💡 בונוס לפיתוח: בדיקה קטנה שרצה פעם אחת, חצי דקה אחרי שהשרת עולה, כדי לוודא שהכל עובד 💡
    @Cron('30 */60 * * * *') // רץ פעם בשעה בשנייה ה-30
    async runIntermittentCheck() {
        this.logger.log('Intermittent LLM health validation is active.');
    }
}
