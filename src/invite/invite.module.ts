import { Module } from '@nestjs/common';
import { ApiClientModule } from '../api-client/api-client.module';
import { HydraModule } from '../hydra/hydra.module';
import { InviteService } from './invite.service';
import { InviteCommand } from './invite.command';
import { InvitesCommand } from './invites.command';
import { TestInviteCommand } from './test-invite.command';
import { TestInvitesCommand } from './test-invites.command';

@Module({
  imports: [ApiClientModule, HydraModule],
  providers: [
    InviteService,
    InviteCommand,
    InvitesCommand,
    TestInviteCommand,
    TestInvitesCommand,
  ],
  exports: [InviteService],
})
export class InviteModule {}
