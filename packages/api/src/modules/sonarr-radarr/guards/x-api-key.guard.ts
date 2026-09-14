import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { ParameterKey } from 'src/app.dto';
import { ParamsService } from 'src/modules/params/params.service';

@Injectable()
export class XApiKeyGuard implements CanActivate {
  public constructor(private readonly paramsService: ParamsService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('Missing X-Api-Key header');
    }

    const expected = await this.paramsService.get(
      ParameterKey.SONARR_RADARR_API_KEY
    );

    if (!expected || apiKey !== expected) {
      throw new UnauthorizedException('Invalid X-Api-Key header');
    }

    return true;
  }
}
