import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { MultiLevelCacheProvider } from './MultiLevelCacheProvider';

@Module({
  imports: [
    // Hot cache configuratie (Layer 1)
    NestCacheModule.register({
      isGlobal: false,
      store: redisStore,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_HOT_PORT || '6379'),
      ttl: 300, // 5 min
      max: 50 * 1024 * 1024, // 50MB
      socket: {
        reconnectStrategy: (retries: number) => Math.min(retries * 100, 3000),
      },
    }),

    // Warm cache configuratie (Layer 2)
    NestCacheModule.register({
      isGlobal: false,
      store: redisStore,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_WARM_PORT || '6380'),
      ttl: 1800, // 30 min
      max: 450 * 1024 * 1024, // 450MB
      socket: {
        reconnectStrategy: (retries: number) => Math.min(retries * 100, 3000),
      },
    }),
  ],
  providers: [
    {
      provide: 'HOT_CACHE',
      useFactory: (cacheManager: any) => cacheManager,
      inject: [NestCacheModule],
    },
    {
      provide: 'WARM_CACHE',
      useFactory: (cacheManager: any) => cacheManager,
      inject: [NestCacheModule],
    },
    MultiLevelCacheProvider,
  ],
  exports: [MultiLevelCacheProvider],
})
export class MultiLevelCacheModule {}
