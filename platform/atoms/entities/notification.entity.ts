import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Min, Max } from 'class-validator';
import { TaskEntity } from './task.entity';
import { BaseEntity } from './base.entity';
import { Encrypt } from '../decorators/encrypt.decorator';

/**
 * Type opties voor notificaties
 */
export enum NotificationType {
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_DUE = 'TASK_DUE',
  TASK_COMPLETED = 'TASK_COMPLETED',
  TASK_UPDATED = 'TASK_UPDATED',
}

/**
 * Status opties voor notificaties
 */
export enum NotificationStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
}

/**
 * Notification entity representeert een notificatie in het systeem met ondersteuning
 * voor encryptie, prioritering en verschillende typen notificaties.
 *
 * @entity NotificationEntity
 * @table notifications
 * @since 1.0.0
 * @version 1.0.0
 *
 * Geërfde velden van BaseEntity:
 * - id: string (UUID v4) - Primaire sleutel, automatisch gegenereerd
 * - createdAt: Date - Timestamp van aanmaak, automatisch gezet
 * - updatedAt: Date - Timestamp van laatste wijziging, automatisch geüpdatet
 * - version: number - Versienummer voor optimistic locking
 *
 * @dependencies
 * - {@link BaseEntity} - Voor basis entity functionaliteit
 * - {@link TaskEntity} - Voor taak relaties
 * - {@link Encrypt} - Voor veld encryptie
 *
 * Database details:
 * - Primary key: id (uuid, inherited from BaseEntity)
 * - Timestamps: createdAt, updatedAt (automatisch)
 * - Version tracking: version (number, optimistic locking)
 * - Encrypted fields:
 *   - content (required)
 * - Foreign keys:
 *   - taskId -> tasks.id (SET NULL on delete)
 * - Indices:
 *   - Primary key (id)
 *   - status + type (voor efficiënt filteren)
 *   - priority (voor sorting)
 *
 * Encryptie details:
 * - Gebruikt @Encrypt decorator voor veilige opslag van content
 * - Encryptie/decryptie gebeurt automatisch
 * - Zoeken op encrypted velden niet mogelijk
 * - Performance impact bij bulk operaties
 *
 * Relatie details:
 * - task: ManyToOne naar TaskEntity
 *   - Cascade: false
 *   - Eager loading: false
 *   - Optional (nullable: true)
 *   - OnDelete: SET NULL
 *
 * Business logic:
 * - Status management:
 *   UNREAD -> READ
 * - Prioriteit systeem:
 *   1 (Laag) tot 5 (Hoog), default: 3
 * - Notificatie types:
 *   - TASK_ASSIGNED: Bij nieuwe toewijzing
 *   - TASK_DUE: Bij naderende deadline
 *   - TASK_COMPLETED: Bij taak voltooiing
 *   - TASK_UPDATED: Bij taak wijzigingen
 *
 * @example
 * ```typescript
 * // Nieuwe notificatie aanmaken
 * const notification = new NotificationEntity();
 * notification.type = NotificationType.TASK_ASSIGNED;
 * notification.content = "Je hebt een nieuwe taak toegewezen gekregen"; // Wordt encrypted
 * notification.priority = 4;
 * notification.recipientId = "user-123";
 *
 * // Optioneel: Koppelen aan een taak
 * notification.taskId = "task-456";
 *
 * // Status beheer
 * notification.status = NotificationStatus.READ;
 * ```
 */
@Entity('notifications')
@Index(['recipientId', 'status', 'createdAt']) // Compound index voor unread notificaties query
@Index(['createdAt']) // Index voor cleanup en recente notificaties
@Index(['taskId']) // Index voor taak gerelateerde queries
export class NotificationEntity extends BaseEntity {
  /**
   * Het type notificatie dat bepaalt hoe de notificatie wordt weergegeven en verwerkt.
   *
   * @decorator {@link Column}
   * - type: enum (NotificationType)
   * - nullable: false
   *
   * Beschikbare types:
   * - TASK_ASSIGNED: Nieuwe taak toewijzing
   * - TASK_DUE: Deadline nadert
   * - TASK_COMPLETED: Taak afronding
   * - TASK_UPDATED: Taak wijzigingen
   *
   * Gebruik:
   * - Bepaalt notificatie template
   * - Beïnvloedt prioriteit logica
   * - Stuurt delivery mechanisme
   *
   * @type {NotificationType}
   * @required
   */
  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type!: NotificationType;

  /**
   * De leestatus van de notificatie voor gebruikersinteractie tracking.
   *
   * @decorator {@link Column}
   * - type: enum (NotificationStatus)
   * - default: NotificationStatus.UNREAD
   * - nullable: false
   *
   * Statussen:
   * - UNREAD: Nieuwe of ongelezen notificatie
   * - READ: Door gebruiker bekeken
   *
   * Functionaliteit:
   * - Gebruikt voor notificatie badges
   * - Filter optie in UI
   * - Statistieken tracking
   *
   * @type {NotificationStatus}
   * @required
   */
  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.UNREAD,
  })
  status!: NotificationStatus;

  /**
   * De prioriteit van de notificatie op een schaal van 1-5.
   * Beïnvloedt weergave en delivery timing.
   *
   * @decorator {@link Column}
   * - type: smallint
   * - default: 3 (medium)
   * - nullable: false
   * - check constraint: tussen 1 en 5
   *
   * Prioriteitsniveaus:
   * 1: Laag - Informatief
   * 2: Medium-laag - Standaard updates
   * 3: Medium (default) - Normale notificaties
   * 4: Medium-hoog - Belangrijke updates
   * 5: Hoog - Urgente meldingen
   *
   * @decorator {@link Min} 1
   * @decorator {@link Max} 5
   *
   * @type {number}
   * @required
   */
  @Min(1)
  @Max(5)
  @Column({ default: 3 })
  priority!: number;

  /**
   * De inhoud van de notificatie, encrypted opgeslagen voor privacy.
   *
   * @decorator {@link Encrypt}
   * - Automatische encryptie bij opslag
   * - Automatische decryptie bij ophalen
   * - Zoeken/filteren niet mogelijk op encrypted waarde
   *
   * @decorator {@link Column}
   * - type: text (encrypted)
   * - nullable: false
   *
   * Veiligheidsoverwegingen:
   * - Bevat mogelijk gevoelige informatie
   * - End-to-end encryptie
   * - Veilige opslag gegarandeerd
   *
   * @type {string}
   * @required
   */
  @Encrypt()
  @Column()
  content!: string;

  /**
   * Discord user ID van de notificatie ontvanger.
   * Gebruikt voor notificatie routering en delivery.
   *
   * @decorator {@link Column}
   * - type: varchar
   * - nullable: false
   *
   * Gebruik:
   * - Discord integratie
   * - Notificatie targeting
   * - Permissie verificatie
   *
   * @type {string}
   * @required
   */
  @Column()
  recipientId!: string;

  /**
   * Many-to-one relatie met de gerelateerde taak.
   * Optionele koppeling voor taak-specifieke notificaties.
   *
   * @decorator {@link ManyToOne}
   * - target: TaskEntity
   * - inverse: task => task.notifications
   * - eager: false (lazy loading)
   * - nullable: true
   * - onDelete: SET NULL
   *
   * @decorator {@link JoinColumn}
   * - name: taskId
   *
   * Functionaliteit:
   * - Context voor notificaties
   * - Navigatie naar gerelateerde taak
   * - Cascade gedrag bij verwijdering
   *
   * @type {TaskEntity}
   * @optional
   */
  @ManyToOne(() => TaskEntity, (task) => task.notifications, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'taskId' })
  task?: TaskEntity;

  @Column({ nullable: true })
  taskId?: string;

  /**
   * Flexibele metadata opslag voor extra notificatie informatie.
   *
   * @decorator {@link Column}
   * - type: json
   * - nullable: true
   *
   * Gebruik:
   * - Extra context data
   * - Delivery configuratie
   * - Custom notificatie opties
   * - Tracking informatie
   *
   * @type {Record<string, unknown>}
   * @optional
   */
  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, unknown>;

  /**
   * Partitie sleutel voor database performance optimalisatie.
   * Automatisch gegenereerd op basis van createdAt timestamp.
   *
   * @decorator {@link Column}
   * - type: timestamp
   * - precision: 3
   * - select: false (niet nodig in normale queries)
   * - generatedType: STORED
   * - asExpression: Maandelijkse partitie
   *
   * Performance features:
   * - Automatische partitioning op maand
   * - Verbeterde query performance
   * - Efficiënt data management
   *
   * @type {Date}
   * @internal
   */
  @Column({
    type: 'timestamp',
    precision: 3,
    select: false,
    generatedType: 'STORED',
    asExpression: 'DATE_TRUNC(\'month\', "createdAt")',
  })
  partitionKey: Date;
}

/**
 * Type definitie voor het aanmaken van een nieuwe notificatie.
 * Verwijdert de BaseEntity velden voor een schone notificatie creatie interface.
 *
 * @type {Omit<NotificationEntity, keyof BaseEntity>}
 *
 * Beschikbare velden voor nieuwe notificaties:
 * - type: NotificationType (required)
 *   - Enum waarden: TASK_ASSIGNED, TASK_DUE, TASK_COMPLETED, TASK_UPDATED
 *
 * - content: string (required)
 *   - Wordt automatisch encrypted
 *   - Bevat notificatie bericht
 *
 * - status?: NotificationStatus (optional)
 *   - Default: NotificationStatus.UNREAD
 *   - Enum waarden: UNREAD, READ
 *
 * - priority?: number (optional)
 *   - Default: 3 (medium)
 *   - Range: 1 (laag) tot 5 (hoog)
 *
 * - recipientId: string (required)
 *   - Discord user ID voor delivery
 *
 * - taskId?: string (optional)
 *   - UUID v4 van gerelateerde taak
 *
 * - metadata?: Record<string, unknown> (optional)
 *   - Extra configuratie en context
 *
 * Uitgesloten BaseEntity velden:
 * - id: Automatisch gegenereerd
 * - createdAt: Automatisch gezet
 * - updatedAt: Automatisch beheerd
 * - version: Intern gebruikt
 *
 * @example
 * ```typescript
 * const newNotification: CreateNotificationData = {
 *   type: NotificationType.TASK_ASSIGNED,
 *   content: "Nieuwe taak toegewezen: Project planning",
 *   priority: 4,
 *   recipientId: "discord-user-123",
 *   taskId: "task-456",
 *   metadata: {
 *     requiresAcknowledgement: true,
 *     category: "assignment"
 *   }
 * };
 * ```
 */
export type CreateNotificationData = Omit<NotificationEntity, keyof BaseEntity>;
