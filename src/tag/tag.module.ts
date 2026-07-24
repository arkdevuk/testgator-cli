import { Module } from '@nestjs/common';
import { ApiClientModule } from '../api-client/api-client.module';
import { HydraModule } from '../hydra/hydra.module';
import { TagService } from './tag.service';
import { TagCommand } from './tag.command';
import { TagListCommand } from './tag-list.command';
import { TagCreateCommand } from './tag-create.command';
import { TagDeleteCommand } from './tag-delete.command';

@Module({
  imports: [ApiClientModule, HydraModule],
  providers: [
    TagService,
    TagCommand,
    TagListCommand,
    TagCreateCommand,
    TagDeleteCommand,
  ],
  exports: [TagService],
})
export class TagModule {}
