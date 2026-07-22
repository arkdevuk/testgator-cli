import { Module } from '@nestjs/common';
import { ApiClientModule } from '../api-client/api-client.module';
import { HydraModule } from '../hydra/hydra.module';
import { ProjectService } from './project.service';
import { ProjectCommand } from './project.command';
import { ProjectListCommand } from './project-list.command';
import { ProjectGetCommand } from './project-get.command';

@Module({
  imports: [ApiClientModule, HydraModule],
  providers: [
    ProjectService,
    ProjectCommand,
    ProjectListCommand,
    ProjectGetCommand,
  ],
  exports: [ProjectService],
})
export class ProjectModule {}
