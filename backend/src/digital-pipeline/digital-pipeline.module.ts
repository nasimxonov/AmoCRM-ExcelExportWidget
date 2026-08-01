import { Module } from '@nestjs/common';
import { AccountModule } from '../accounts/account.module';
import { AmoCrmModule } from '../amocrm/amocrm.module';
import { GoogleModule } from '../google/google.module';
import { DigitalPipelineController } from './digital-pipeline.controller';
import { DigitalPipelineService } from './digital-pipeline.service';

@Module({
  imports: [AccountModule, AmoCrmModule, GoogleModule],
  controllers: [DigitalPipelineController],
  providers: [DigitalPipelineService],
})
export class DigitalPipelineModule {}
