import { Module } from '@nestjs/common';
import { ApiClientModule } from '../api-client/api-client.module';
import { HydraModule } from '../hydra/hydra.module';
import { AnswerService } from './answer.service';
import { AnswerCommand } from './answer.command';
import { AnswerListCommand } from './answer-list.command';
import { AnswerGetCommand } from './answer-get.command';
import { AnswerEditCommand } from './answer-edit.command';
import { AnswerDeleteCommand } from './answer-delete.command';

@Module({
  imports: [ApiClientModule, HydraModule],
  providers: [
    AnswerService,
    AnswerCommand,
    AnswerListCommand,
    AnswerGetCommand,
    AnswerEditCommand,
    AnswerDeleteCommand,
  ],
  exports: [AnswerService],
})
export class AnswerModule {}
