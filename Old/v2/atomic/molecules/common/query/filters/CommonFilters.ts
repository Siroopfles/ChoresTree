import { SelectQueryBuilder } from 'typeorm';
import { BaseEntity } from '@v2/core/database/base/BaseEntity';

/**
 * Common query filters that can be applied to any entity
 */
export class CommonFilters {
  /**
   * Add pagination to query
   */
  static addPagination<T extends BaseEntity>(
    queryBuilder: SelectQueryBuilder<T>,
    page: number = 1,
    pageSize: number = 10
  ): SelectQueryBuilder<T> {
    const skip = (page - 1) * pageSize;
    return queryBuilder
      .skip(skip)
      .take(pageSize);
  }

  /**
   * Add ordering to query
   */
  static addOrdering<T extends BaseEntity>(
    queryBuilder: SelectQueryBuilder<T>,
    orderBy: keyof T,
    order: 'ASC' | 'DESC' = 'ASC'
  ): SelectQueryBuilder<T> {
    return queryBuilder.orderBy(`${queryBuilder.alias}.${String(orderBy)}`, order);
  }

  /**
   * Add date range filter
   */
  static addDateRange<T extends BaseEntity>(
    queryBuilder: SelectQueryBuilder<T>,
    dateField: keyof T,
    startDate?: Date,
    endDate?: Date
  ): SelectQueryBuilder<T> {
    if (startDate) {
      queryBuilder.andWhere(`${queryBuilder.alias}.${String(dateField)} >= :startDate`, { startDate });
    }
    if (endDate) {
      queryBuilder.andWhere(`${queryBuilder.alias}.${String(dateField)} <= :endDate`, { endDate });
    }
    return queryBuilder;
  }

  /**
   * Add soft delete filter
   */
  static addSoftDeleteFilter<T extends BaseEntity>(
    queryBuilder: SelectQueryBuilder<T>,
    includeDeleted: boolean = false
  ): SelectQueryBuilder<T> {
    if (!includeDeleted) {
      queryBuilder.andWhere(`${queryBuilder.alias}.deletedAt IS NULL`);
    }
    return queryBuilder;
  }

  /**
   * Add server scope filter
   */
  static addServerScope<T extends BaseEntity>(
    queryBuilder: SelectQueryBuilder<T>,
    serverId?: string
  ): SelectQueryBuilder<T> {
    if (serverId) {
      queryBuilder.andWhere(`${queryBuilder.alias}.serverId = :serverId`, { serverId });
    }
    return queryBuilder;
  }
}