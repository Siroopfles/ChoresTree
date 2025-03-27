import { ConfigAuditLog } from '@/atomic/atoms/database/entities/ConfigAuditLog';
import { ServerScopedRepository } from './BaseRepository';
import { AppDataSource } from '@/config/database';

export class ConfigAuditLogRepository extends ServerScopedRepository<ConfigAuditLog> {
  constructor() {
    super(AppDataSource.getRepository(ConfigAuditLog), 'config_audit_log');
  }

  async logConfigChange(
    serverId: string,
    key: string,
    oldValue: unknown,
    newValue: unknown,
    updatedBy: string,
    action: 'update' | 'delete' | 'create'
  ): Promise<ConfigAuditLog> {
    const auditLog = new ConfigAuditLog();
    auditLog.serverId = serverId;
    auditLog.key = key;
    auditLog.oldValue = oldValue;
    auditLog.newValue = newValue;
    auditLog.updatedBy = updatedBy;
    auditLog.action = action;

    return this.repository.save(auditLog);
  }

  async getAuditLogs(
    serverId: string,
    options?: {
      key?: string;
      action?: 'update' | 'delete' | 'create';
      limit?: number;
      offset?: number;
    }
  ): Promise<ConfigAuditLog[]> {
    const query = this.repository
      .createQueryBuilder('audit_log')
      .where('audit_log.serverId = :serverId', { serverId })
      .orderBy('audit_log.createdAt', 'DESC');

    if (options?.key) {
      query.andWhere('audit_log.key = :key', { key: options.key });
    }

    if (options?.action) {
      query.andWhere('audit_log.action = :action', { action: options.action });
    }

    if (options?.limit) {
      query.take(options.limit);
    }

    if (options?.offset) {
      query.skip(options.offset);
    }

    return query.getMany();
  }
}