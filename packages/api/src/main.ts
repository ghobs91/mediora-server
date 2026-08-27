import { NestFactory } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import winston from 'winston';
import jwt from 'jsonwebtoken';
import { router as bullBoardMiddleware } from 'bull-board';
import * as bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { winstonOptions } from './utils/winston-options';
import { markBaselineMigrationIfNeeded } from './mark-baseline-migration';
import { env } from './env';

// bull-board is mounted outside of nest, guard it manually
// it accepts the token from the auth cookie or bearer header
function requireToken(req: any, res: any, next: any) {
  const auth = req.headers.authorization || '';
  const token =
    (auth.startsWith('Bearer ') ? auth.slice(7) : '') ||
    req.cookies?.bobarr_token;

  if (!token) {
    res.status(401).send('Unauthorized');
    return;
  }

  try {
    jwt.verify(token, env.JWT_SECRET);
    next();
  } catch (_e) {
    res.status(401).send('Unauthorized');
  }
}

async function bootstrap() {
  const logger = WinstonModule.createLogger(winstonOptions);
  await markBaselineMigrationIfNeeded(winston.createLogger(winstonOptions));
  const app = await NestFactory.create(AppModule, { logger });
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
  app.use(cookieParser());
  app.use('/jobs', requireToken, bullBoardMiddleware);
  await app.listen(4000);
}
bootstrap();
