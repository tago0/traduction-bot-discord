# Discord Translation Bot

This bot allows users to translate messages in Discord using the DeepL API.

## Setup

1. Create a Discord application and bot at https://discord.com/developers/applications
2. Get a DeepL API key from https://www.deepl.com/pro-api
3. Copy your Discord bot token and DeepL API key
4. Add them to the .env file:
   - DISCORD_TOKEN=your_discord_token_here
   - DEEPL_API_KEY=your_deepl_api_key_here
5. Install dependencies: `npm install`
6. Start the bot: `npm start`

## Usage

Use the following command to translate text:
```
!translate [language_code] [text]
```

Example:
```
!translate FR Hello, how are you?
```

Available language codes:
- EN (English)
- FR (French)
- DE (German)
- ES (Spanish)
- IT (Italian)
- NL (Dutch)
- PL (Polish)
- PT (Portuguese)
- RU (Russian)
- JA (Japanese)
- ZH (Chinese)
And more...