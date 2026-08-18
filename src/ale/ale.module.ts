import { Module } from '@nestjs/common';
import { AleService } from './ale.service';

@Module({
  providers: [AleService],
  exports: [AleService],
})
export class AleModule {}
