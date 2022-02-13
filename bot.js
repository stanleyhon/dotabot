// Require the necessary discord.js classes
const fs = require('fs');
const { Client, Collection, Intents } = require('discord.js');
const { token } = require('./config.json');

const { GetLastMatchId, GetMatchDetails, GetFunFact, LookupHeroName } = require('./queries.js');

let DOTDOTDOTLOADING = `<loading more info>`;

let DEBUG_MODE = false;

// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  // Set a new item in the Collection
  // With the key as the command name and the value as the exported module
  client.commands.set(command.data.name, command);
}

const prepare_broadcast = async (match_details) => {
  let didWin = false; // for now just assume everyone played on the same team.
  let duration = Math.round(match_details.duration);
  // template:

  /*
  Stanley (Luna) [1/5/12]
  Luccas (Rubick) [1/2/12]
  Rawm (Meepo) [2/2/12]

  Won in 32 min.

  ...loading more info...
  */

  let prepared_message  = "\n";
  for (result of match_details.results_array) {
    let heroName = LookupHeroName(result.hero_id)
    prepared_message += `<@!${result.discord_id}> (${heroName}) `;
    prepared_message += `[${result.kills}/${result.deaths}/${result.assists}]`;
    prepared_message += `\n`;
    didWin = result.win;
  }
  prepared_message += `\n`;

  if (didWin) {
    prepared_message += `Won`;
  } else {
    prepared_message += `Lost`;
  }

  prepared_message += ` in ${duration} mins.\n\n${DOTDOTDOTLOADING}`;
  return prepared_message;
}

// When the client is ready, run this code (only once)
client.once('ready', () => {
  console.log('Ready!');
  client.user.setActivity('Dota 2', { type: 'PLAYING' });

  main();
});

const debugFunction = async () => {
  let text_channel = await client.channels.fetch('940008295022874679');

  let message = await text_channel.send("test 123 <@!162053725915971585> 123");
}

const main = async () => {
  let last_match = fs.readFileSync('./last_match.data', 'utf-8');
  try {
    let new_last_match = await GetLastMatchId().catch(e => { console.log(e) });
    if (last_match != new_last_match) {
      let match_details = await GetMatchDetails(new_last_match).catch(e => { throw e; });
      let broadcast_message = await prepare_broadcast(match_details).catch(e => { console.log(e) });
      await Broadcast(broadcast_message).catch(e => { console.log(e) });
      await RecordNewLastMatch(new_last_match).catch(e => { console.log(e) });
    } else {
      console.log(new Date() + " no new match found.");
    }
  } catch (e) {
    console.log("something went wrong.");
    console.log(e);
  }

  await UpdateFunFactMessages();

  // await debugFunction();

  await setTimeout(() => { main(); }, 10000);
}

const RecordNewLastMatch = async (new_last_match) => {
  fs.writeFileSync('./last_match.data', new_last_match.toString());
}

const UpdateFunFactMessages = async () => {
  let notify_channels_raw = fs.readFileSync('./notify_channels.data', 'utf-8');
  let notify_channels = notify_channels_raw.split('\n');

  let notify_messages_raw = fs.readFileSync('./last_message.data', 'utf-8');
  let notify_messages = notify_messages_raw.split('\n');

  notify_channels = notify_channels.map(str => str.trim());
  notify_messages = notify_messages.map(str => str.trim());

  // console.log(notify_channels);
  // console.log(notify_messages);

  let message_index = 0;

  for (channel of notify_channels) {
    let text_channel = client.channels.cache.get(channel);
    if (!text_channel) {
      message_index++;
      continue;
    }

    //console.log(notify_messages[message_index]);
    let message = await text_channel.messages.fetch(notify_messages[message_index], { force: true });
    message_index++;

    if (message && message.content && message.content.search(DOTDOTDOTLOADING) != -1) {
      console.log ('found ...loading to replace');
      let newFunFact = "";
      try {
        newFunFact = await GetFunFact();
      } catch (e) {
        console.log(e);
        return;
      }

      if (DEBUG_MODE) {
        console.log ("Would edit message at this point to replace DOTDOT with " + newFunFact);
        return;
      }

      // console.log("about to replace with " + newFunFact);
      new_message = message.content.replace(DOTDOTDOTLOADING, newFunFact);
      message.edit(new_message);
    }
  }

}

const Broadcast = async (broadcast_message) => {
  let notify_channels_raw = fs.readFileSync('./notify_channels.data', 'utf-8');
  let notify_channels = notify_channels_raw.split('\n');

  let persistance_data = "";

  for (let channel of notify_channels) {
    let text_channel = client.channels.cache.get(channel);

    if (DEBUG_MODE) {
      console.log("DEBUGMODE: Send [" + broadcast_message + "] to channelID:" + text_channel);
      continue;
    }
    let message = await text_channel.send(broadcast_message);
    persistance_data += (`${message.id}\n`);
  }

  if (DEBUG_MODE) {
    return;
  }

  // record the message IDs in the order of notify_channel
  fs.writeFileSync('./last_message.data', persistance_data);
}

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
  }
});

// Login to Discord with your client's token
client.login(token);