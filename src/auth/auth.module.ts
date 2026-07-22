import { Module } from '@nestjs/common';
import { ApiClientModule } from '../api-client/api-client.module';
import { TokenCacheModule } from '../token-cache/token-cache.module';
import { AuthService } from './auth.service';
import { LoginCommand } from '../commands/login.command';
import { SetupCommand } from '../commands/setup.command';
import { SetupQuestions } from '../commands/setup.questions';

@Module({
  imports: [ApiClientModule, TokenCacheModule],
  providers: [AuthService, LoginCommand, SetupCommand, SetupQuestions],
  exports: [AuthService],
})
export class AuthModule {}
