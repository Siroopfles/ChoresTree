import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { TaskEntity } from './task.entity';
import { RoleEntity } from './role.entity';

/**
 * Junction entity die de Many-to-Many relatie tussen Task en Role implementeert.
 * Faciliteert het toewijzen van rollen aan taken met extra metadata ondersteuning.
 *
 * @entity TaskRolesEntity
 * @table task_roles
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
 * - {@link TaskEntity} - Voor de taak relatie
 * - {@link RoleEntity} - Voor de rol relatie
 * - {@link BaseEntity} - Voor basis entity functionaliteit
 *
 * Database details:
 * - Primary key: id (uuid, inherited from BaseEntity)
 * - Timestamps:
 *   - createdAt (automatisch)
 *   - updatedAt (automatisch)
 * - Version tracking: version (number, optimistic locking)
 * - Foreign keys:
 *   - taskId -> task.id (CASCADE delete)
 *   - roleId -> role.id (CASCADE delete)
 * - Indices:
 *   - Primary key (id)
 *   - Foreign keys (taskId, roleId)
 *
 * Initialisatie:
 * ```typescript
 * // Nieuwe task-role relatie aanmaken
 * const taskRole = new TaskRolesEntity();
 * taskRole.taskId = "task-123";  // UUID v4 string
 * taskRole.roleId = "role-456";  // UUID v4 string
 * taskRole.metadata = {
 *   addedBy: "user-789",
 *   addedAt: new Date().toISOString(),
 *   reason: "Project toegang"
 * };
 *
 * // Of met complete entity relaties en metadata
 * taskRole.task = task;    // TaskEntity instance
 * taskRole.role = role;    // RoleEntity instance
 *
 * // Na opslag/ophalen uit database:
 * console.log(taskRole.id);        // UUID v4 string
 * console.log(taskRole.createdAt); // Date object
 * console.log(taskRole.updatedAt); // Date object
 * console.log(taskRole.version);   // Nummer, start bij 1
 * ```
 */
@Entity('task_roles')
export class TaskRolesEntity extends BaseEntity {
  /**
   * Relatie naar de gekoppelde taak.
   *
   * @decorator {@link ManyToOne}
   * - target: () => TaskEntity
   * - inverse: task => task.taskRoles
   * - onDelete: CASCADE - Verwijdert deze koppeling als de taak wordt verwijderd
   *
   * @decorator {@link JoinColumn}
   * - name: 'taskId' - Naam van de foreign key kolom
   *
   * @type {TaskEntity}
   * @required
   */
  @ManyToOne(() => TaskEntity, task => task.taskRoles, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'taskId' })
  task!: TaskEntity;

  @Column()
  taskId!: string;

  /**
   * Relatie naar de gekoppelde rol.
   *
   * @decorator {@link ManyToOne}
   * - target: () => RoleEntity
   * - inverse: role => role.taskRoles
   * - onDelete: CASCADE - Verwijdert deze koppeling als de rol wordt verwijderd
   *
   * @decorator {@link JoinColumn}
   * - name: 'roleId' - Naam van de foreign key kolom
   *
   * @type {RoleEntity}
   * @required
   */
  @ManyToOne(() => RoleEntity, role => role.taskRoles, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'roleId' })
  role!: RoleEntity;

  @Column()
  roleId!: string;

  /**
   * Extra metadata voor de task-role relatie.
   * Slaat aanvullende informatie op over de koppeling tussen taak en rol.
   *
   * @decorator {@link Column}
   * - type: jsonb - PostgreSQL JSONB type voor flexibele JSON opslag
   * - default: {} - Leeg object als default waarde
   *
   * @type {Record<string, unknown>}
   * @optional - Metadata kan undefined zijn, zal dan default naar {}
   *
   * Metadata structuur:
   * {
   *   addedBy?: string;      // UUID van gebruiker die koppeling maakte
   *   addedAt?: string;      // ISO timestamp van koppeling (new Date().toISOString())
   *   reason?: string;       // Reden voor de rol toewijzing
   *   expiresAt?: string;    // Optionele vervaldatum (ISO timestamp)
   *   permissions?: string[]; // Specifieke permissies binnen deze rol
   *   ...                    // Uitbreidbaar met custom velden
   * }
   *
   * Constraints:
   * - Alle datums moeten ISO-8601 timestamp strings zijn
   * - UUIDs moeten valid UUID v4 strings zijn
   * - Arrays moeten unieke waarden bevatten
   * - Nested objects maximaal 2 levels diep
   *
   * Test Cases:
   * - Metadata is optioneel (undefined toegestaan)
   * - Metadata accepteert valid timestamps
   * - Metadata kan uitgebreid worden met custom velden
   * - Relaties met Task en Role entities worden correct behouden
   */
  @Column('jsonb', { default: {} })
  metadata?: Record<string, unknown>;
}