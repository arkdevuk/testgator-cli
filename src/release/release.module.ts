import { Module } from '@nestjs/common';
import { ApiClientModule } from '../api-client/api-client.module';
import { HydraModule } from '../hydra/hydra.module';
import { ReleaseService } from './release.service';
import { ReleaseCommand } from './release.command';
import { ReleaseListCommand } from './release-list.command';
import { ReleaseGetCommand } from './release-get.command';
import { ReleaseCreateCommand } from './release-create.command';
import { ReleaseEditCommand } from './release-edit.command';

@Module({
  imports: [ApiClientModule, HydraModule],
  providers: [
    ReleaseService,
    ReleaseCommand,
    ReleaseListCommand,
    ReleaseGetCommand,
    ReleaseCreateCommand,
    ReleaseEditCommand,
  ],
  exports: [ReleaseService],
})
export class ReleaseModule {}
