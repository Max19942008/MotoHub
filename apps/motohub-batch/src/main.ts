import { NestFactory } from '@nestjs/core';
import { MotohubBatchModule } from './motohub-batch.module';

async function bootstrap() {
  const app = await NestFactory.create(MotohubBatchModule);
  await app.listen(process.env.PORT_BATCH?? 3000);
}
bootstrap();
