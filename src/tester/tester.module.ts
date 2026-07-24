import { Module } from '@nestjs/common';
import { ApiClientModule } from '../api-client/api-client.module';
import { HydraModule } from '../hydra/hydra.module';
import { TesterService } from './tester.service';
import { TesterCommand } from './tester.command';
import { TesterListCommand } from './tester-list.command';
import { TesterGetCommand } from './tester-get.command';
import { TesterTagCommand } from './tester-tag.command';
import { TesterTagAddCommand } from './tester-tag-add.command';
import { TesterTagRemoveCommand } from './tester-tag-remove.command';
import { TesterNoteService } from './tester-note.service';
import { TesterNoteCommand } from './tester-note.command';
import { TesterNoteListCommand } from './tester-note-list.command';
import { TesterNoteAddCommand } from './tester-note-add.command';
import { TesterDisableCommand } from './tester-disable.command';
import { TesterEnableCommand } from './tester-enable.command';

@Module({
  imports: [ApiClientModule, HydraModule],
  providers: [
    TesterService,
    TesterCommand,
    TesterListCommand,
    TesterGetCommand,
    TesterTagCommand,
    TesterTagAddCommand,
    TesterTagRemoveCommand,
    TesterNoteService,
    TesterNoteCommand,
    TesterNoteListCommand,
    TesterNoteAddCommand,
    TesterDisableCommand,
    TesterEnableCommand,
  ],
  exports: [TesterService],
})
export class TesterModule {}
