import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { LoggerService } from './logger/logger.service';

/**
 * Bootstrap the Catalog Microservice
 * Single source of truth for all product data
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Disable Express ETags. This is a JSON API whose responses are per-user and
  // token-scoped, so conditional revalidation buys nothing - and it actively
  // broke sign-in: the browser cached /api/auth/profile, revalidated it with
  // If-None-Match and got a bodyless 304, which the frontend read as a failed
  // profile fetch, cleared the token and redirected back to /login in a loop.
  app.getHttpAdapter().getInstance().set('etag', false);

  // Get logger service
  const logger = app.get(LoggerService);

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Enable CORS
  const corsOrigins = process.env.CORS_ORIGIN?.split(',') || ['*'];
  app.enableCors({
    origin: corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global prefix for API routes (exclude health/ready endpoints)
  app.setGlobalPrefix('api', { exclude: ['health', 'ready'] });

  const port = process.env.PORT || 3200;
  await app.listen(port);

  logger.log(`Catalog Microservice is running on port ${port}`, 'Bootstrap');
  logger.log(`Environment: ${process.env.NODE_ENV}`, 'Bootstrap');
  logger.log(`Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`, 'Bootstrap');
}

bootstrap();

