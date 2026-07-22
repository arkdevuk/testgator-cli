import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ApiClientService } from './api-client.service';
import { ApiConfigService } from './api-config.service';
import { TokenCacheModule } from '../token-cache/token-cache.module';

@Module({
  imports: [HttpModule, TokenCacheModule],
  providers: [ApiClientService, ApiConfigService],
  exports: [ApiClientService, ApiConfigService],
})
export class ApiClientModule {}
