import { Entity, Column, OneToMany } from 'typeorm';
import { IsString, IsArray, IsOptional, IsNotEmpty } from 'class-validator';
import { TaskRolesEntity } from './task-roles.entity';
import { BaseEntity } from './base.entity';

/**
 * Type definitie voor Discord rol metadata.
 * Bevat Discord-specifieke rol eigenschappen die worden gesynchroniseerd.
 *
 * @interface DiscordRoleMetadata
 * @since 1.0.0
 *
 * Properties:
 * - color: HEX kleurcode van de rol (#RRGGBB)
 * - position: Positie van de rol in de hiërarchie (0-based)
 * - managed: Of de rol door Discord/bots wordt beheerd
 * - mentionable: Of de rol @mentionable is
 * - [key: string]: Ondersteunt extra Discord rol eigenschappen
 */
interface DiscordRoleMetadata {
  color?: string;
  position?: number;
  managed?: boolean;
  mentionable?: boolean;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Role entity voor het beheren van Discord rollen en hun permissies binnen het systeem.
 * Implementeert rol-gebaseerde toegangscontrole (RBAC) en Discord rol synchronisatie.
 *
 * @entity RoleEntity
 * @table roles
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
 * - {@link TaskRolesEntity} - Voor de many-to-many relatie met taken
 * - {@link BaseEntity} - Voor basis entity functionaliteit
 *
 * Database details:
 * - Primary key: id (uuid, inherited from BaseEntity)
 * - Timestamps: createdAt, updatedAt (automatisch)
 * - Version tracking: version (number, optimistic locking)
 * - Indices:
 *   - Primary key (id)
 *   - discordRoleId (unique)
 *   - serverId + name (unique)
 *
 * Permission Types:
 * De permissions array ondersteunt de volgende types:
 * - TASK_CREATE - Taken aanmaken
 * - TASK_READ - Taken bekijken
 * - TASK_UPDATE - Taken wijzigen
 * - TASK_DELETE - Taken verwijderen
 * - TASK_ASSIGN - Taken toewijzen aan anderen
 * - MEMBER_MANAGE - Leden beheren
 * - ROLE_MANAGE - Rollen beheren
 * - SETTINGS_MANAGE - Serverinstellingen beheren
 *
 * Discord Integratie:
 * De entity synchroniseert met Discord rollen via:
 * 1. Automatische updates bij Discord rol wijzigingen
 * 2. Bi-directionele permissie synchronisatie
 * 3. Error handling voor Discord API limitaties
 *
 * Initialisatie:
 * ```typescript
 * // Nieuwe rol aanmaken
 * const role = new RoleEntity();
 * role.name = "Moderator";
 * role.permissions = ["TASK_READ", "TASK_UPDATE"];
 * role.discordRoleId = "123456789";
 * role.serverId = "987654321";
 * role.metadata = {
 *   color: "#FF0000",
 *   position: 1,
 *   mentionable: true
 * };
 *
 * // Na opslag/ophalen uit database:
 * console.log(role.id);        // UUID v4 string
 * console.log(role.createdAt); // Date object
 * console.log(role.name);      // "Moderator"
 * ```
 */
@Entity('roles')
export class RoleEntity extends BaseEntity {
  /**
   * Naam van de rol zoals weergegeven in het systeem.
   * Moet uniek zijn binnen een server (combined met serverId).
   *
   * @decorator {@link Column}
   * @decorator {@link IsString} - Valideert dat de waarde een string is
   * @decorator {@link IsNotEmpty} - Voorkomt lege waardes
   *
   * @type {string}
   * @required
   *
   * Constraints:
   * - Moet uniek zijn per server
   * - Mag geen speciale tekens bevatten
   * - Maximum lengte: 100 karakters
   * - Wordt gebruikt voor weergave in UI
   */
  @Column()
  @IsString()
  @IsNotEmpty()
  name!: string;

  /**
   * Array van toegestane permissies voor deze rol.
   * Definieert welke acties gebruikers met deze rol kunnen uitvoeren.
   *
   * @decorator {@link Column}
   * - type: simple-array - Opgeslagen als comma-separated string
   * @decorator {@link IsArray} - Valideert dat de waarde een array is
   * @decorator {@link IsString} - Valideert dat alle items strings zijn
   *
   * @type {string[]}
   * @required
   *
   * Ondersteunde permissies:
   * - TASK_CREATE: Nieuwe taken aanmaken
   * - TASK_READ: Bestaande taken bekijken
   * - TASK_UPDATE: Taken wijzigen
   * - TASK_DELETE: Taken verwijderen
   * - TASK_ASSIGN: Taken toewijzen
   * - MEMBER_MANAGE: Leden beheren
   * - ROLE_MANAGE: Rollen beheren
   * - SETTINGS_MANAGE: Server instellingen
   *
   * Validatie:
   * - Alleen voorgedefinieerde permissie types toegestaan
   * - Duplicaten worden automatisch verwijderd
   * - Minimum 1 permissie vereist
   */
  @Column('simple-array')
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];

  /**
   * Unieke identifier van de gekoppelde Discord rol.
   * Wordt gebruikt voor synchronisatie met Discord.
   *
   * @decorator {@link Column}
   * @decorator {@link IsString} - Valideert dat de waarde een string is
   * @decorator {@link IsNotEmpty} - Voorkomt lege waardes
   *
   * @type {string}
   * @required
   *
   * Details:
   * - Moet een valide Discord snowflake ID zijn
   * - Wordt gebruikt voor real-time synchronisatie
   * - Uniek binnen het systeem
   * - Automatisch ingevuld bij rol creatie via Discord
   */
  @Column()
  @IsString()
  @IsNotEmpty()
  discordRoleId!: string;

  /**
   * Identifier van de Discord server waar deze rol bij hoort.
   * Zorgt voor isolatie tussen verschillende Discord servers.
   *
   * @decorator {@link Column}
   * @decorator {@link IsString} - Valideert dat de waarde een string is
   * @decorator {@link IsNotEmpty} - Voorkomt lege waardes
   *
   * @type {string}
   * @required
   *
   * Details:
   * - Moet een valide Discord snowflake ID zijn
   * - Wordt gebruikt voor server-specifieke queries
   * - Maakt deel uit van unieke constraints
   * - Automatisch ingevuld bij rol creatie
   */
  @Column()
  @IsString()
  @IsNotEmpty()
  serverId!: string;

  /**
   * Extra metadata specifiek voor Discord rol eigenschappen.
   * Slaat Discord-specifieke configuratie op zoals kleur en positie.
   *
   * @decorator {@link Column}
   * - type: jsonb - PostgreSQL JSONB type voor flexibele JSON opslag
   * - default: {} - Leeg object als default waarde
   * @decorator {@link IsOptional} - Veld mag undefined zijn
   *
   * @type {DiscordRoleMetadata}
   * @optional
   *
   * Ondersteunde eigenschappen:
   * - color: HEX kleurcode (#RRGGBB)
   * - position: Hiërarchie positie (number)
   * - managed: Door Discord beheerd (boolean)
   * - mentionable: @mentionable status (boolean)
   *
   * Synchronisatie:
   * - Wordt bi-directioneel gesynchroniseerd
   * - Updates triggeren Discord API calls
   * - Automatische validatie van waardes
   */
  @Column('jsonb', { default: {} })
  @IsOptional()
  metadata?: DiscordRoleMetadata;

  /**
   * Many-to-Many relatie met taken via de TaskRoles junction entity.
   * Geeft toegang tot alle taken waar deze rol toegang tot heeft.
   *
   * @decorator {@link OneToMany}
   * - target: () => TaskRolesEntity
   * - inverse: taskRole => taskRole.role
   *
   * @type {TaskRolesEntity[]}
   * @optional
   *
   * Details:
   * - Lazy loading standaard
   * - Cascade: false (handmatige deletion)
   * - Bi-directionele relatie via TaskRoles
   * - Inclusief metadata per taak-rol koppeling
   */
  @OneToMany(() => TaskRolesEntity, taskRole => taskRole.role)
  taskRoles?: TaskRolesEntity[];
}