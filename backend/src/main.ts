import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { json } from 'body-parser';
import { AppModule } from './app.module';
import { seedAdmin } from './core/seeds/user.seed';
import { seedLlmProviders } from './core/seeds/llm-providers.seed';
// import { seedGenetics } from './modules/genetics/seeds/genetics.seed';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import { LlmModelEntity } from './modules/llm-provider/entities/llm-model.entity';
import { LlmProviderEntity } from './modules/llm-provider/entities/llm-provider.entity';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  app.use(json({ limit: '20mb' }));
  app.use(cookieParser());

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
    credentials: true,
  });

  const config = new DocumentBuilder().setTitle('API').setVersion('1.0').build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  try {
    fs.writeFileSync('./swagger-spec.json', JSON.stringify(document, null, 2));
  } catch (error) {
    console.warn('Failed to write swagger-spec.json:', error);
  }

  // ─── C5 boot assertion ──────────────────────────────────────────────────
  // Prevents the exact regression that caused C5: @RequiresConfirmation
  // decorator writes metadata, but the swagger-spec never receives the
  // x-requires-confirmation extension — causing dangerous operations to
  // execute without human confirmation. This assertion verifies the
  // decorator-to-spec pipeline is intact at startup.
  {
    const EXPECTED_CONFIRMATION_OPS = [
      'UsersController_delete',
      'UsersController_updateRole',
      'LlmProviderController_cleanupTestResults',
    ];

    const actualConfirmationOps: string[] = [];
    for (const pathObj of Object.values(document.paths ?? {})) {
      for (const op of Object.values(pathObj as Record<string, any>)) {
        if (op?.['x-requires-confirmation'] === true && op.operationId) {
          actualConfirmationOps.push(op.operationId);
        }
      }
    }

    const actualSet = new Set(actualConfirmationOps);
    const missingFromSpec = EXPECTED_CONFIRMATION_OPS.filter((id) => !actualSet.has(id));
    const unexpectedInSpec = actualConfirmationOps.filter((id) => !EXPECTED_CONFIRMATION_OPS.includes(id));

    if (missingFromSpec.length > 0 || unexpectedInSpec.length > 0) {
      const lines: string[] = ['C5 boot assertion failed:'];
      if (missingFromSpec.length) {
        lines.push(`  Missing from spec (decorated but absent): ${missingFromSpec.join(', ')}`);
      }
      if (unexpectedInSpec.length) {
        lines.push(`  Unexpected in spec (not in expected list): ${unexpectedInSpec.join(', ')}`);
      }
      lines.push(`  Expected: ${EXPECTED_CONFIRMATION_OPS.join(', ')}`);
      lines.push(`  Actual:   ${actualConfirmationOps.join(', ')}`);
      throw new Error(lines.join('\n'));
    }

    console.log(`✅ C5 assertion passed: ${actualConfirmationOps.length} confirmation-required operations in swagger spec`);
  }

  const dataSource = app.get(DataSource);
  await seedAdmin(dataSource);
  // await seedLlmProviders(dataSource);
  // await seedGenetics(dataSource);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`Server running on http://localhost:${port}`);
  console.log(`Swagger: http://localhost:${port}/api`);
}

void bootstrap();
