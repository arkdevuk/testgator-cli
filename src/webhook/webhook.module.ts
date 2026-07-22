import { Module } from '@nestjs/common';
import { ApiClientModule } from '../api-client/api-client.module';
import { HydraModule } from '../hydra/hydra.module';
import { WebhookService } from './webhook.service';
import { WebhookCommand } from './webhook.command';
import { WebhookEnableCommand } from './webhook-enable.command';
import { WebhookDisableCommand } from './webhook-disable.command';
import { WebhookSetUrlCommand } from './webhook-set-url.command';

@Module({
  imports: [ApiClientModule, HydraModule],
  providers: [
    WebhookService,
    WebhookCommand,
    WebhookEnableCommand,
    WebhookDisableCommand,
    WebhookSetUrlCommand,
  ],
  exports: [WebhookService],
})
export class WebhookModule {}
