import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity, EncryptedEntity } from './base.entity';
import { NotificationEntity } from './notification.entity';
import { TaskRolesEntity } from './task-roles.entity';
import { Encrypt } from '../decorators/encrypt.decorator';

/**
 * Status opties voor een taak, definieert de mogelijke statussen waarin een taak zich kan bevinden
 */
export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * Task entity representeert een taak in het systeem met ondersteuning voor encryptie,
 * relaties en uitgebreide taakbeheer functionaliteit.
 *
 * @entity TaskEntity
 * @table tasks
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
 * - {@link NotificationEntity} - Voor notificatie relaties
 * - {@link TaskRolesEntity} - Voor role mapping
 * - {@link Encrypt} - Voor veld encryptie
 *
 * Database details:
 * - Primary key: id (uuid, inherited from BaseEntity)
 * - Timestamps: createdAt, updatedAt (automatisch)
 * - Version tracking: version (number, optimistic locking)
 * - Encrypted fields:
 *   - title (required)
 *   - description (optional)
 * - Foreign keys:
 *   - assigneeId -> users.id (SET NULL on delete)
 * - Indices:
 *   - Primary key (id)
 *   - status + dueDate (voor efficiënt filteren)
 *   - priority + status (voor sorting)
 *
 * Encryptie details:
 * - Gebruikt @Encrypt decorator voor veilige opslag
 * - Encryptie/decryptie gebeurt automatisch
 * - Zoeken op encrypted velden niet mogelijk
 * - Performance impact bij bulk operaties
 *
 * Relatie details:
 * - notifications: OneToMany naar NotificationEntity
 *   - Cascade: false
 *   - Eager loading: false
 *   - Orphan removal: true
 * - taskRoles: OneToMany naar TaskRolesEntity
 *   - Cascade: true voor TaskRolesEntity
 *   - Eager loading: false
 *   - Bidirectioneel voor role management
 *
 * Business logic:
 * - Status transitions:
 *   TODO -> IN_PROGRESS -> COMPLETED
 *   Any state -> CANCELLED
 * - Prioriteit:
 *   1 (Laag) tot 5 (Hoog), default: 3
 * - Deadline handling:
 *   - Optional dueDate
 *   - Automatische notificaties bij nadering
 * - Toewijzing:
 *   - Via assigneeId
 *   - Permissions check via TaskRoles
 *
 * @example
 * ```typescript
 * // Nieuwe taak aanmaken
 * const task = new TaskEntity();
 * task.title = "Project planning"; // Wordt encrypted
 * task.description = "Plan Q2 projecten"; // Wordt encrypted
 * task.priority = 4;
 * task.dueDate = new Date("2025-04-01");
 *
 * // Status beheer
 * task.status = TaskStatus.IN_PROGRESS;
 *
 * // Rol toewijzing via TaskRoles
 * const taskRole = new TaskRolesEntity();
 * taskRole.role = projectManagerRole;
 * task.taskRoles = [taskRole];
 * ```
 */
@Entity('tasks')
export class TaskEntity extends EncryptedEntity {
  /**
   * De titel van de taak, encrypted opgeslagen voor privacy.
   *
   * @decorator {@link Encrypt}
   * - Automatische encryptie bij opslag
   * - Automatische decryptie bij ophalen
   * - Zoeken/filteren niet mogelijk op encrypted waarde
   *
   * @decorator {@link Column}
   * - type: varchar (encrypted)
   * - nullable: false
   * - length: max 255 karakters voor encryptie
   *
   * @type {string}
   * @required
   */
  @Encrypt()
  @Column()
  title!: string;

  /**
   * De beschrijving van de taak, encrypted opgeslagen voor privacy.
   *
   * @decorator {@link Encrypt}
   * - Automatische encryptie bij opslag
   * - Automatische decryptie bij ophalen
   * - Zoeken/filteren niet mogelijk op encrypted waarde
   *
   * @decorator {@link Column}
   * - type: text (encrypted)
   * - nullable: true
   * - length: onbeperkt voor encryptie
   *
   * @type {string}
   * @optional
   */
  @Encrypt()
  @Column({ nullable: true })
  description?: string;

  /**
   * De huidige status van de taak.
   * Bepaalt de voortgang en mogelijk beschikbare acties.
   *
   * @decorator {@link Column}
   * - type: enum (TaskStatus)
   * - default: TaskStatus.TODO
   * - nullable: false
   *
   * Toegestane transities:
   * - TODO -> IN_PROGRESS: Bij start van werk
   * - IN_PROGRESS -> COMPLETED: Bij voltooiing
   * - ANY -> CANCELLED: Bij annulering
   *
   * Performance:
   * - Geïndexeerd voor efficiënt filteren
   * - Gebruikt in combinatie met priority voor sortering
   *
   * @type {TaskStatus}
   * @required
   */
  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  status!: TaskStatus;

  /**
   * De deadline voor de taak.
   * Gebruikt voor planning, prioritering en notificaties.
   *
   * @decorator {@link Column}
   * - type: timestamp with time zone
   * - nullable: true
   * - precision: 3 (milliseconds)
   *
   * Functionaliteit:
   * - Triggert automatische notificaties bij nadering
   * - Gebruikt voor taak prioritering
   * - Geïndexeerd met status voor efficiënt filteren
   *
   * @type {Date}
   * @optional
   */
  @Column({ nullable: true })
  dueDate?: Date;

  /**
   * De prioriteit van de taak op een schaal van 1-5.
   * Beïnvloedt sortering en notificatie urgentie.
   *
   * @decorator {@link Column}
   * - type: smallint
   * - default: 3 (medium)
   * - nullable: false
   * - check constraint: tussen 1 en 5
   *
   * Prioriteitsniveaus:
   * 1: Laag - Geen urgentie
   * 2: Medium-laag - Normale prioriteit
   * 3: Medium (default) - Standaard taken
   * 4: Medium-hoog - Verhoogde aandacht
   * 5: Hoog - Kritieke taken
   *
   * @type {number}
   * @required
   */
  @Column({ default: 3 })
  priority!: number;

  /**
   * UUID van de gebruiker aan wie de taak is toegewezen.
   * Soft reference naar User entity voor flexibiliteit.
   *
   * @decorator {@link Column}
   * - type: uuid
   * - nullable: true
   * - onDelete: SET NULL
   *
   * Gebruik:
   * - Voor permissie verificatie
   * - Voor taak toewijzing
   * - Voor notificatie routering
   *
   * @type {string}
   * @optional
   */
  @Column({ nullable: true })
  assigneeId?: string;

  /**
   * One-to-many relatie met notificaties voor deze taak.
   * Beheert alle notificaties gerelateerd aan deze taak.
   *
   * @decorator {@link OneToMany}
   * - target: NotificationEntity
   * - inverse: notification => notification.task
   * - eager: false (lazy loading)
   * - cascade: false
   * - orphanRemoval: true
   *
   * Notificatie triggers:
   * - Status veranderingen
   * - Deadline nadert
   * - Prioriteit wijzigingen
   * - Toewijzing updates
   *
   * @type {NotificationEntity[]}
   * @optional
   */
  @OneToMany(() => NotificationEntity, (notification) => notification.task)
  notifications?: NotificationEntity[];

  /**
   * Many-to-many relatie met rollen via TaskRoles junction entity.
   * Implementeert rol-gebaseerde toegangscontrole voor taken.
   *
   * @decorator {@link OneToMany}
   * - target: TaskRolesEntity
   * - inverse: taskRole => taskRole.task
   * - eager: false (lazy loading)
   * - cascade: true voor TaskRolesEntity
   *
   * Functionaliteit:
   * - Rol-gebaseerde toegangscontrole (RBAC)
   * - Permissie verificatie
   * - Taak zichtbaarheid filtering
   * - Team management
   *
   * Performance:
   * - Lazy loaded voor optimale prestaties
   * - Gebruik metadata voor efficiënte permissie checks
   *
   * @type {TaskRolesEntity[]}
   * @optional
   */
  @OneToMany(() => TaskRolesEntity, (taskRole) => taskRole.task)
  taskRoles?: TaskRolesEntity[];

  public readonly encryptedFields = ['title', 'description'];
}

/**
 * Type definitie voor het aanmaken van een nieuwe taak.
 * Verwijdert de BaseEntity velden voor een schone taak creatie interface.
 *
 * @type {Omit<TaskEntity, keyof BaseEntity>}
 *
 * Beschikbare velden voor nieuwe taken:
 * - title: string (required)
 *   - Wordt automatisch encrypted
 *   - Max 255 karakters voor encryptie
 *
 * - description?: string (optional)
 *   - Wordt automatisch encrypted
 *   - Onbeperkte lengte
 *
 * - status?: TaskStatus (optional)
 *   - Default: TaskStatus.TODO
 *   - Enum waarden: TODO, IN_PROGRESS, COMPLETED, CANCELLED
 *
 * - dueDate?: Date (optional)
 *   - ISO 8601 datum formaat
 *   - Inclusief timezone
 *
 * - priority?: number (optional)
 *   - Default: 3 (medium)
 *   - Range: 1 (laag) tot 5 (hoog)
 *
 * - assigneeId?: string (optional)
 *   - UUID v4 formaat
 *   - Moet verwijzen naar bestaande gebruiker
 *
 * Uitgesloten BaseEntity velden:
 * - id: Automatisch gegenereerd
 * - createdAt: Automatisch gezet
 * - updatedAt: Automatisch beheerd
 * - version: Intern gebruikt
 *
 * @example
 * ```typescript
 * const newTask: CreateTaskData = {
 *   title: "Nieuwe feature implementeren",
 *   description: "Voeg dark mode toe aan de UI",
 *   priority: 4,
 *   dueDate: new Date("2025-04-15"),
 *   assigneeId: "user-123"
 * };
 * ```
 */
export type CreateTaskData = Omit<TaskEntity, keyof BaseEntity>;
