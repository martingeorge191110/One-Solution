import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

// Loaded via require so it stays callable regardless of @types/cookie-parser's
// export shape (which varies by version) without needing esModuleInterop.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require('cookie-parser');

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
