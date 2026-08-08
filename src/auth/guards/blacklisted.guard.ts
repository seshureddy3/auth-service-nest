import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class BlackListGuard implements CanActivate {
  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return true;
    }

    const tokenArray = authHeader.split(' ');
    const rawToken = tokenArray[1];

    if (!rawToken) {
      throw new UnauthorizedException(
        'Malformed authorization token structure.',
      );
    }

    const isBlackListed =
      await this.redisService.isAccessTokenBlacklisted(rawToken);

    if (isBlackListed) {
      throw new UnauthorizedException(
        'This session has been terminated. Please log in again.',
      );
    }

    return true;
  }
}
