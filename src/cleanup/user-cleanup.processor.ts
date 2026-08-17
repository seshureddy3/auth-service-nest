import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job, Queue } from 'bullmq';
import { User } from 'src/auth/entities/user.entity';
import { Repository } from 'typeorm';

@Processor('USER_CLEANUP_QUEUE', {
  settings: {
    backoffStrategy: (attemptsMade: number, type?: string) => {
      if (type === 'staggeredIntervals') {
        if (attemptsMade === 1) return 15 * 60 * 1000;
        if (attemptsMade === 2) return 30 * 60 * 1000;
        if (attemptsMade === 3) return 60 * 60 * 1000;
      }

      return -1;
    },
  },
})
@Injectable()
export class UserCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(UserCleanupProcessor.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectQueue('USER_CLEANUP_DLQ')
    private readonly dlqQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<{ userId: string }>): Promise<any> {
    const { userId } = job.data;
    this.logger.log(`Processing hard-delete for user ${userId}`);

    const targetUser = await this.userRepo.findOne({
      where: { id: userId },
      withDeleted: true,
    });

    if (!targetUser) {
      this.logger.warn(`User ${userId} not found. Skipping.`);
      return;
    }

    await this.userRepo.delete(userId);
    this.logger.log(`✅ Permanently deleted user ${userId}`);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, error: Error) {
    this.logger.error(`❌ Job ${job.id} failed: ${error.message}`);

    if (job.opts.attempts && job.attemptsMade >= job.opts.attempts) {
      this.logger.warn(`🚨 Job exhausted retries. Moving to DLQ.`);

      await this.dlqQueue.add(`dlq-${job.name}`, {
        originalData: job.data,
        error: error.message,
        failedAt: new Date().toISOString(),
      });
    }
  }
}
