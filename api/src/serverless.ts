import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

// Loaded via require so it stays callable regardless of @types/cookie-parser's
// export shape (which varies by version) without needing esModuleInterop.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require('cookie-parser');

/**
 * Serverless entrypoint for Vercel. Mirrors src/main.ts but, instead of binding a
 * port with app.listen(), it initialises the Nest app and hands the underlying
 * Express instance to the platform. The bootstrap promise is cached across warm
 * invocations so a container only pays the Nest startup cost on a cold start.
 */
let cached: Promise<(req: unknown, res: unknown) => void> | null = null;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });
  app.setGlobalPrefix('api');

  await app.init();
  return app.getHttpAdapter().getInstance();
}

export default async function handler(req: unknown, res: unknown) {
  if (!cached) {
    cached = bootstrap();
  }
  const instance = await cached;
  return instance(req, res);
}
