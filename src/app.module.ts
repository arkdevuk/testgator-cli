import { Module } from '@nestjs/common';
import { GuideCommand } from './commands/guide.command';
import { PingCommand } from './commands/ping.command';
import { HydraModule } from './hydra/hydra.module';
import { ApiClientModule } from './api-client/api-client.module';
import { TokenCacheModule } from './token-cache/token-cache.module';
import { AuthModule } from './auth/auth.module';
import { ProjectModule } from './project/project.module';
import { PlanModule } from './plan/plan.module';
import { QuestionModule } from './question/question.module';
import { TesterModule } from './tester/tester.module';
import { AnswerModule } from './answer/answer.module';
import { ReleaseModule } from './release/release.module';
import { WebhookModule } from './webhook/webhook.module';
import { InviteModule } from './invite/invite.module';
import { TagModule } from './tag/tag.module';

@Module({
  imports: [
    HydraModule,
    ApiClientModule,
    TokenCacheModule,
    AuthModule,
    ProjectModule,
    PlanModule,
    QuestionModule,
    TesterModule,
    AnswerModule,
    ReleaseModule,
    WebhookModule,
    InviteModule,
    TagModule,
  ],
  providers: [GuideCommand, PingCommand],
})
export class AppModule {}
