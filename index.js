import { Client, GatewayIntentBits, Events, ApplicationCommandType, ActivityType } from 'discord.js';
import * as deepl from 'deepl-node';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const translator = new deepl.Translator(process.env.DEEPL_API_KEY);

const PREFIX = '!translate';
const messageCache = new Map();

const LANGUAGES = [
  { name: '🇫🇷 French', value: 'FR' },
  { name: '🇬🇧 English', value: 'EN' },
  { name: '🇩🇪 German', value: 'DE' },
  { name: '🇪🇸 Spanish', value: 'ES' },
  { name: '🇮🇹 Italian', value: 'IT' },
  { name: '🇯🇵 Japanese', value: 'JA' },
  { name: '🇨🇳 Chinese', value: 'ZH' },
  { name: '🇹🇷 Turkish', value: 'TR' }
];

function updateActivity() {
  const serverCount = client.guilds.cache.size;
  const userCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
  
  client.user.setPresence({
    activities: [
      {
        name: `${serverCount} servers | ${userCount} users`,
        type: ActivityType.Watching
      }
    ],
    status: 'online'
  });
}

// Fonction pour nettoyer le cache des messages toutes les 5 minutes
function cleanMessageCache() {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [key, data] of messageCache.entries()) {
    if (data.timestamp < fiveMinutesAgo) {
      messageCache.delete(key);
    }
  }
}

client.on(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  
  updateActivity();
  setInterval(updateActivity, 5000);
  setInterval(cleanMessageCache, 60000); // Nettoie le cache toutes les minutes

  try {
    const commands = [
      {
        name: 'translate',
        description: 'Translate text to another language',
        options: [
          {
            name: 'language',
            description: 'Target language',
            type: 3,
            required: true,
            choices: LANGUAGES.map(lang => ({
              name: lang.name,
              value: lang.value
            }))
          },
          {
            name: 'text',
            description: 'Text to translate',
            type: 3,
            required: true
          }
        ]
      },
      {
        name: 'Translate Message',
        type: ApplicationCommandType.Message
      },
      {
        name: 'support',
        description: 'Get support information and join our support server'
      },
      {
        name: 'invite',
        description: 'Get the bot invitation link'
      }
    ];
    
    await client.application.commands.set(commands);
    console.log('Commands registered successfully!');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isMessageContextMenuCommand()) {
      const targetMessage = interaction.targetMessage;
      
      if (!targetMessage?.content) {
        await interaction.reply({
          content: '❌ I cannot access the message content. This might happen if the message is too old.',
          ephemeral: true
        });
        return;
      }
      
      await interaction.deferReply({ ephemeral: true });
      
      // Générer un ID unique pour ce message
      const messageKey = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      messageCache.set(messageKey, {
        content: targetMessage.content,
        timestamp: Date.now()
      });
      
      const rows = [];
      let currentRow = { type: 1, components: [] };
      
      for (const lang of LANGUAGES) {
        if (currentRow.components.length === 5) {
          rows.push(currentRow);
          currentRow = { type: 1, components: [] };
        }
        
        currentRow.components.push({
          type: 2,
          custom_id: `translate_${lang.value}_${messageKey}`,
          label: lang.name,
          style: 1
        });
      }
      
      if (currentRow.components.length > 0) {
        rows.push(currentRow);
      }

      await interaction.editReply({
        content: 'Choose a language to translate to:',
        components: rows,
        ephemeral: true
      });
    } else if (interaction.isButton()) {
      await interaction.deferReply({ ephemeral: true });
      
      const [action, lang, messageKey] = interaction.customId.split('_');
      
      if (action === 'translate') {
        try {
          const messageData = messageCache.get(messageKey);
          
          if (!messageData) {
            await interaction.editReply({
              content: '❌ Translation session expired. Please try translating the message again.',
              ephemeral: true
            });
            return;
          }
          
          const result = await translator.translateText(messageData.content, null, lang);
          await interaction.editReply({
            content: `Translation (${lang}):\n${result.text}`,
            ephemeral: true
          });
          
          // Supprimer l'entrée du cache après utilisation
          messageCache.delete(messageKey);
        } catch (error) {
          console.error('Translation error:', error);
          await interaction.editReply({
            content: '❌ Sorry, there was an error translating the message.',
            ephemeral: true
          });
        }
      }
    } else if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'translate') {
        const targetLang = interaction.options.getString('language');
        const textToTranslate = interaction.options.getString('text');

        await interaction.deferReply({ ephemeral: true });
        const result = await translator.translateText(textToTranslate, null, targetLang);
        await interaction.editReply({
          content: `Translation (${targetLang}):\n${result.text}`,
          ephemeral: true
        });
      } else if (interaction.commandName === 'support') {
        await interaction.reply({
          content: '🌟 **Need help with the Translation Bot?**\n\n' +
                  '• Join our Support Server: https://discord.gg/worldpack\n' +
                  '• Contact the developer: your-tago0_\n\n' +
                  'Our support team is always ready to help you!',
          ephemeral: true
        });
      } else if (interaction.commandName === 'invite') {
        const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=274878221312&scope=applications.commands%20bot`;
        await interaction.reply({
          content: '🎉 **Invite Translation Bot to your server!**\n\n' +
                  `[Click here to invite the bot](${inviteLink})\n\n` +
                  'The bot needs the following permissions:\n' +
                  '• Send Messages\n' +
                  '• Read Messages/View Channels\n' +
                  '• Use Application Commands\n\n' +
                  'Thank you for using Translation Bot! 🌍',
          ephemeral: true
        });
      }
    }
  } catch (error) {
    console.error('Interaction error:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Sorry, there was an error processing your request.',
          ephemeral: true
        });
      } else {
        await interaction.editReply({
          content: '❌ Sorry, there was an error processing your request.',
          ephemeral: true
        });
      }
    } catch (e) {
      console.error('Error handling interaction error:', e);
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  
  if (message.content.startsWith(PREFIX)) {
    const args = message.content.slice(PREFIX.length).trim().split(' ');
    const targetLang = args[0];
    const textToTranslate = args.slice(1).join(' ');

    if (!targetLang || !textToTranslate) {
      return message.reply('Usage: !translate [language_code] [text]\nExample: !translate FR Hello, how are you?');
    }

    try {
      const result = await translator.translateText(textToTranslate, null, targetLang.toUpperCase());
      await message.reply(`Translation (${targetLang.toUpperCase()}): ${result.text}`);
    } catch (error) {
      console.error('Translation error:', error);
      await message.reply('❌ Sorry, there was an error translating your message. Please check the language code and try again.');
    }
  }
});

client.login(process.env.DISCORD_TOKEN);