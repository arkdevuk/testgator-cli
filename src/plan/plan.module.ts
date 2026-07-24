import { Module } from '@nestjs/common';
import { ApiClientModule } from '../api-client/api-client.module';
import { HydraModule } from '../hydra/hydra.module';
import { PlanService } from './plan.service';
import { PlanCommand } from './plan.command';
import { PlanListCommand } from './plan-list.command';
import { PlanGetCommand } from './plan-get.command';
import { PlanCreateCommand } from './plan-create.command';
import { PlanEditCommand } from './plan-edit.command';
import { PlanDuplicateService } from './plan-duplicate.service';
import { PlanDuplicateCommand } from './plan-duplicate.command';
import { PlanRemoveTesterCommand } from './plan-remove-tester.command';

@Module({
  imports: [ApiClientModule, HydraModule],
  providers: [
    PlanService,
    PlanCommand,
    PlanListCommand,
    PlanGetCommand,
    PlanCreateCommand,
    PlanEditCommand,
    PlanDuplicateService,
    PlanDuplicateCommand,
    PlanRemoveTesterCommand,
  ],
  exports: [PlanService, PlanDuplicateService],
})
export class PlanModule {}
