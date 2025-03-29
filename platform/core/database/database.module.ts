import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  connectionOptions,
  monitorConnectionPool,
  createQueryMonitoringMiddleware,
} from './connection';
import { DataSource } from 'typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...connectionOptions,
        // Voeg middleware toe voor query monitoring
        subscribers: [],
        // Gebruik de middleware voor query monitoring
        // @ts-ignore - TypeORM types zijn niet up-to-date
        middlewares: [createQueryMonitoringMiddleware()],
      }),
      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error('Database options not provided');
        }
        const dataSource = await new DataSource(options).initialize();
        // Start connection pool monitoring
        monitorConnectionPool(dataSource);
        return dataSource;
        return dataSource;
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
