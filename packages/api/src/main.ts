import { NestFactory } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import winston from 'winston';
import jwt from 'jsonwebtoken';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { NextFunction, Request, Response } from 'express';

import { AppModule } from './app.module';
import { winstonOptions } from './utils/winston-options';
import { markBaselineMigrationIfNeeded } from './mark-baseline-migration';
import { env } from './env';
import { SetupStateService } from './modules/setup/setup-state.service';
import { JobsQueue } from './app.dto';

// bull-board is mounted outside of nest, guard it manually
// it accepts the token from the auth cookie or bearer header
function requireToken(req: Request, res: Response, next: NextFunction) {
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
  app.enableCors({ origin: true, credentials: true });
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
  app.use(cookieParser());

  const setupState = app.get(SetupStateService);

  const queues = [
    JobsQueue.DOWNLOAD,
    JobsQueue.RENAME_AND_LINK,
    JobsQueue.REFRESH_TORRENT,
    JobsQueue.SCAN_LIBRARY,
  ].map((name) => new BullMQAdapter(app.get<Queue>(getQueueToken(name))));

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/jobs');
  createBullBoard({ queues, serverAdapter });

  app.use(
    '/jobs',
    async (req: Request, res: Response, next: NextFunction) => {
      if (await setupState.isSetupRequired()) {
        res.status(423).send('Complete setup first');
        return;
      }
      requireToken(req, res, next);
    },
    serverAdapter.getRouter()
  );

  await app.listen(4000);
}
bootstrap();