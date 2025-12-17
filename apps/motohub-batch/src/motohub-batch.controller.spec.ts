import { Test, TestingModule } from '@nestjs/testing';
import { MotohubBatchController } from './motohub-batch.controller';
import { MotohubBatchService } from './motohub-batch.service';

describe('MotohubBatchController', () => {
  let motohubBatchController: MotohubBatchController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [MotohubBatchController],
      providers: [MotohubBatchService],
    }).compile();

    motohubBatchController = app.get<MotohubBatchController>(MotohubBatchController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(motohubBatchController.getHello()).toBe('Hello World!');
    });
  });
});
