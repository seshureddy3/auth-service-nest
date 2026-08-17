import { Module } from '@nestjs/common';
import { CleanupService } from './cleanup.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/auth/entities/user.entity';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserCleanupProcessor } from './user-cleanup.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),

    ConfigService,

    BullModule.registerQueue(
      {
        name: 'USER_CLEANUP_QUEUE',
        defaultJobOptions: {
          attempts: 4,
          backoff: {
            type: 'staggeredIntervals',
          },
        },
      },
      {
        name: 'USER_CLEANUP_DLQ',
      },
    ),
  ],
  providers: [CleanupService, UserCleanupProcessor],
})
export class CleanupModule {}
