import { Module } from '@nestjs/common';
import { ApiClientModule } from '../api-client/api-client.module';
import { HydraModule } from '../hydra/hydra.module';
import { TesterService } from './tester.service';
import { TesterCommand } from './tester.command';
import { TesterListCommand } from './tester-list.command';
import { TesterGetCommand } from './tester-get.command';

@Module({
  imports: [ApiClientModule, HydraModule],
  providers: [
    TesterService,
    TesterCommand,
    TesterListCommand,
    TesterGetCommand,
  ],
  exports: [TesterService],
})
export class TesterModule {}
