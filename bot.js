// Require the necessary discord.js classes
const fs = require('fs');
const { Client, Collection, Intents } = require('discord.js');
const { token } = require('./config.json');

const { GetLastMatchId, GetMatchDetails, GetFunFact, LookupHeroName } = require('./queries.js');

let FUNFACTFIELDNAME = `Fun Fact`;
let DOTDOTDOTLOADING = `loading...`;

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
  // inside a command, event listener, etc.
  let didWin = false; // for now just assume everyone played on the same team.
  let duration = Math.round(match_details.duration);

  let embedFields = [];
  for (result of match_details.results_array) {
    let heroName = LookupHeroName(result.hero_id)

    let newField = {};
    newField.name = `${heroName}`;
    newField.value = `<@!${result.discord_id}> (${result.kills}/${result.deaths}/${result.assists})`;

    embedFields.push(newField);

    didWin = result.win;
  }

  // Now add one more field for the fun fact.
  let funField = {
    name: 'Fun Fact',
    value: `${DOTDOTDOTLOADING}`
  };

  embedFields.push(funField);

  let winOrLoseText = (didWin ? `Win` : `Loss`);
  const embed_message = {
    color: 0x0099ff,
    title: `${winOrLoseText} - ${duration} mins`,
    fields: embedFields,
  };

  return embed_message;
}

// When the client is ready, run this code (only once)
client.once('ready', () => {
  console.log('Logged into Discord.');
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
    let lastMatchData = await GetLastMatchId();
    let new_last_match_id = lastMatchData.match_id;
    let new_last_match_timestamp = lastMatchData.timestamp;
    // last_match_timestamp must be newer than the timestamp on disk
    // if it isn't, discard.
    let last_match_timestamp = fs.readFileSync('./last_match_timestamp.data',  'utf-8');

    // DEBUG ONLY
    // last_match_timestamp = new_last_match_timestamp - 1;
    // new_last_match_id = 6430768258;

    if (last_match_timestamp >= new_last_match_timestamp) {
      console.log(new Date() + " no new match found.");
    } else {
      console.log(new Date() + " new match found.")
      if (last_match != new_last_match_id) {
        let match_details = await GetMatchDetails(new_last_match_id);
        let broadcast_message = await prepare_broadcast(match_details);
        await Broadcast(broadcast_message);
        await RecordNewLastMatch(new_last_match_id);
        await RecordNewLastMatchTimestamp(new_last_match_timestamp);
      }
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

const RecordNewLastMatchTimestamp= async (new_last_match_timestamp) => {
  fs.writeFileSync('./last_match_timestamp.data', new_last_match_timestamp.toString());
}

const UpdateFunFactMessages = async () => {
  let notify_channels_raw = fs.readFileSync('./notify_channels.data', 'utf-8');
  let notify_channels = notify_channels_raw.split('\n');

  let notify_messages_raw = fs.readFileSync('./last_message.data', 'utf-8');
  let notify_messages = notify_messages_raw.split('\n');

  notify_channels = notify_channels.map(str => str.trim());
  notify_messages = notify_messages.map(str => str.trim());

  let message_index = 0;

  for (channel of notify_channels) {
    let text_channel = client.channels.cache.get(channel);
    if (!text_channel) {
      message_index++;
      continue;
    }

    //console.log(notify_messages[message_index]);
    let message = await text_channel.messages.fetch(notify_messages[message_index], { force: true });
    //console.log(message);
    message_index++;

    let needsUpdate = false;
    for (let field of message.embeds[0].fields) {
      console.log(field);
      if (field.name == FUNFACTFIELDNAME && field.value == DOTDOTDOTLOADING) {
        needsUpdate = true;
        break;
      }
    }

    console.log(needsUpdate);

    if (message && needsUpdate) {
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

      // find the right field to edit:
      for (let field of message.embeds[0].fields) {
        if (field.name == FUNFACTFIELDNAME) {
          field.value = newFunFact;
        }
      }
      await message.edit({embeds: message.embeds});
    }
  }

}

const Broadcast = async (broadcast_embed) => {
  let notify_channels_raw = fs.readFileSync('./notify_channels.data', 'utf-8');
  let notify_channels = notify_channels_raw.split('\n');

  let persistance_data = "";

  for (let channel of notify_channels) {
    let text_channel = client.channels.cache.get(channel);

    if (DEBUG_MODE) {
      console.log("DEBUGMODE: Send [");
      console.log(broadcast_embed);
      console.log("] to channelID:" + text_channel);
      continue;
    }

    let message = await text_channel.send({ embeds: [broadcast_embed] });
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