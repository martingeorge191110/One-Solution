import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cookie parser
  app.use(cookieParser());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // CORS
  const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  app.enableCors({
    origin: webOrigin,
    credentials: true,
  });

  // Global API prefix
  app.setGlobalPrefix('api');

  // Listen
  const port = parseInt(process.env.PORT ?? '5000', 10);
  await app.listen(port);
  console.log(`ONE SOLUTIONS API running on http://localhost:${port}/api`);
  console.log(`Health check: http://localhost:${port}/api/health`);
}

bootstrap();
