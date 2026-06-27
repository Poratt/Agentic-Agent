import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { seedAdmin } from './core/seeds/user.seed';
import { seedLlmProviders } from './core/seeds/llm-providers.seed';
import { seedGenetics } from './modules/genetics/seeds/genetics.seed';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import { LlmModelEntity } from './modules/llm-provider/entities/llm-model.entity';
import { LlmProviderEntity } from './modules/llm-provider/entities/llm-provider.entity';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.enableCors({
    origin: 'http://localhost:4200',
    credentials: true,
  });

  const config = new DocumentBuilder().setTitle('API').setVersion('1.0').build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  fs.writeFileSync('./swagger-spec.json', JSON.stringify(document, null, 2));

  const dataSource = app.get(DataSource);
  await seedAdmin(dataSource);
  await seedLlmProviders(dataSource);
  await seedGenetics(dataSource);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`Server running on http://localhost:${port}`);
  console.log(`Swagger: http://localhost:${port}/api`);
}

void bootstrap();
