import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisClientType } from '@redis/client';
import { createClient } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: RedisClientType;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const clientOptions: any = {
      url: this.configService.get<string>('REDIS_URL'),
      RESP: 2,
    };

    this.client = createClient(clientOptions);

    this.client.on('error', (err) =>
      this.logger.error(`Redis Client Error: ${err.message}`),
    );

    await this.client.connect();
    this.logger.log(`🚀 Natively connected to local Redis cache successfully.`);
  }

  async setRefreshToken(
    userId: string,
    hashedToken: string,
    ttl = 604800,
  ): Promise<void> {
    await this.client.set(`refresh_token:${userId}`, hashedToken, { EX: ttl });
  }

  async getRefreshToken(userId: string): Promise<string | null> {
    return this.client.get(`refresh_token:${userId}`);
  }

  async delRefreshToken(userId: string): Promise<void> {
    await this.client.del(`refresh_token:${userId}`);
  }

  async blacklistAccessToken(
    token: string,
    ttlInSeconds: number,
  ): Promise<void> {
    await this.client.set(`blacklist:${token}`, 'true', { EX: ttlInSeconds });
  }

  async isAccessTokenBlacklisted(token: string): Promise<boolean> {
    const result = await this.client.get(`blacklist:${token}`);
    return result === 'true';
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.disconnect();
    }
  }
}
