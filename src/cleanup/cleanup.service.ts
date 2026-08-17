import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { User } from 'src/auth/entities/user.entity';
import { LessThan, Repository } from 'typeorm';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectQueue('USER_CLEANUP_QUEUE')
    private readonly cleanupQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async enqueueOldUsersForDeletion(): Promise<void> {
    this.logger.log('🔍 Scanning for users deleted over 60 days ago...');

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const usersToDelete = await this.userRepo.find({
      where: {
        deletedAt: LessThan(sixtyDaysAgo),
      },
      withDeleted: true,
      select: {
        id: true,
      },
    });

    if (usersToDelete.length === 0) {
      this.logger.log('✨ No users met the criteria today.');
      return;
    }

    for (const user of usersToDelete) {
      await this.cleanupQueue.add('hard-delete-user', { userId: user.id });
    }

    this.logger.log(`📥 Enqueued ${usersToDelete.length} users for deletion.`);
  }
}
