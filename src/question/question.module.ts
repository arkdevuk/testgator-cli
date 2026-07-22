import { Module } from '@nestjs/common';
import { ApiClientModule } from '../api-client/api-client.module';
import { HydraModule } from '../hydra/hydra.module';
import { QuestionService } from './question.service';
import { QuestionCommand } from './question.command';
import { QuestionListCommand } from './question-list.command';
import { QuestionGetCommand } from './question-get.command';
import { QuestionCreateCommand } from './question-create.command';
import { QuestionEditCommand } from './question-edit.command';

@Module({
  imports: [ApiClientModule, HydraModule],
  providers: [
    QuestionService,
    QuestionCommand,
    QuestionListCommand,
    QuestionGetCommand,
    QuestionCreateCommand,
    QuestionEditCommand,
  ],
  exports: [QuestionService],
})
export class QuestionModule {}
