import { Test, TestingModule } from '@nestjs/testing';
import { AleService } from './ale.service';

describe('AleService', () => {
  let service: AleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AleService],
    }).compile();

    service = module.get<AleService>(AleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
