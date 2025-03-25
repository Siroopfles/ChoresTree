import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

// Command builder voor het config command met subcommands
export const commandBuilder = new SlashCommandBuilder()
  .setName('config')
  .setDescription('Beheer server configuratie')
  .addSubcommandGroup(group => 
    group
      .setName('settings')
      .setDescription('Beheer server instellingen')
      .addSubcommand(subcommand =>
        subcommand
          .setName('set')
          .setDescription('Pas een instelling aan')
          .addStringOption(option =>
            option
              .setName('setting')
              .setDescription('De instelling om aan te passen')
              .setRequired(true)
              .addChoices(
                { name: 'Notificatie kanaal', value: 'notification_channel' },
                { name: 'Prefix', value: 'prefix' },
                { name: 'Taal', value: 'language' }
              )
          )
          .addStringOption(option =>
            option
              .setName('waarde')
              .setDescription('De nieuwe waarde')
              .setRequired(true)
          )
      )
  )
  .addSubcommandGroup(group =>
    group
      .setName('permissions')
      .setDescription('Beheer permissies')
      .addSubcommand(subcommand =>
        subcommand
          .setName('set')
          .setDescription('Pas permissies aan')
          .addRoleOption(option =>
            option
              .setName('role')
              .setDescription('De rol om aan te passen')
              .setRequired(true)
          )
          .addStringOption(option =>
            option
              .setName('command')
              .setDescription('Het command om permissies voor in te stellen')
              .setRequired(true)
          )
          .addStringOption(option =>
            option
              .setName('toegang')
              .setDescription('Toegang instellen')
              .setRequired(true)
              .addChoices(
                { name: 'Toestaan', value: 'allow' },
                { name: 'Weigeren', value: 'deny' }
              )
          )
      )
  )
  .addSubcommandGroup(group =>
    group
      .setName('customize')
      .setDescription('Pas server voorkeuren aan')
      .addSubcommand(subcommand =>
        subcommand
          .setName('set')
          .setDescription('Pas een voorkeur aan')
          .addStringOption(option =>
            option
              .setName('optie')
              .setDescription('De voorkeur om aan te passen')
              .setRequired(true)
              .addChoices(
                { name: 'Welkom bericht', value: 'welcome_message' },
                { name: 'Notificatie stijl', value: 'notification_style' }
              )
          )
          .addStringOption(option =>
            option
              .setName('waarde')
              .setDescription('De nieuwe waarde')
              .setRequired(true)
          )
      )
  )
  .addSubcommandGroup(group =>
    group
      .setName('audit')
      .setDescription('Bekijk en beheer audit logs')
      .addSubcommand(subcommand =>
        subcommand
          .setName('view')
          .setDescription('Bekijk audit logs')
          .addStringOption(option =>
            option
              .setName('type')
              .setDescription('Type wijzigingen om te bekijken')
              .setRequired(false)
              .addChoices(
                { name: 'Alle wijzigingen', value: 'all' },
                { name: 'Instellingen', value: 'settings' },
                { name: 'Permissies', value: 'permissions' },
                { name: 'Voorkeuren', value: 'preferences' }
              )
          )
      )
  )
  .addSubcommandGroup(group =>
    group
      .setName('view')
      .setDescription('Bekijk huidige configuratie')
      .addSubcommand(subcommand =>
        subcommand
          .setName('all')
          .setDescription('Bekijk alle instellingen')
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('category')
          .setDescription('Bekijk specifieke categorie')
          .addStringOption(option =>
            option
              .setName('categorie')
              .setDescription('De categorie om te bekijken')
              .setRequired(true)
              .addChoices(
                { name: 'Instellingen', value: 'settings' },
                { name: 'Permissies', value: 'permissions' },
                { name: 'Voorkeuren', value: 'preferences' }
              )
          )
      )
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);