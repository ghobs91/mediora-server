// eslint-disable-next-line import/no-extraneous-dependencies
import { Response } from 'express';

import os from 'os';
import path from 'path';
import axios from 'axios';
import { constants } from 'fs';
import { promises as fs } from 'fs';

import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Query,
  Res,
} from '@nestjs/common';

const CACHE_ROOT = path.join(os.tmpdir(), 'bobarr-image-cache');
const SAFE_IMAGE_PATH = /^[\w-]+(\/[\w-]+)*\.(jpg|jpeg|png|webp|svg)$/;

@Controller('image-cache')
export class ImageCacheController {
  @Get()
  public async getFromCache(
    @Query('i') imageUrl: string,
    @Res() res: Response
  ) {
    if (!imageUrl || !SAFE_IMAGE_PATH.test(imageUrl)) {
      throw new HttpException(
        'INVALID_IMAGE_URL',
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }

    const filePath = path.resolve(CACHE_ROOT, imageUrl);

    if (!filePath.startsWith(CACHE_ROOT + path.sep)) {
      throw new HttpException(
        'INVALID_IMAGE_URL',
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }

    try {
      await fs.access(filePath, constants.R_OK);
      return res.sendFile(filePath);
    } catch (error) {
      const { data: buffer } = await axios.get(
        `https://image.tmdb.org/t/p/${imageUrl}`,
        {
          responseType: 'arraybuffer',
        }
      );

      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, buffer);
      return res.sendFile(filePath);
    }
  }
}
