import { Module } from '@nestjs/common';
import { TokenCacheService } from './token-cache.service';

@Module({
  providers: [TokenCacheService],
  exports: [TokenCacheService],
})
export class TokenCacheModule {}
