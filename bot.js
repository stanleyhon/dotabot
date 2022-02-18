// Require the necessary discord.js classes
const fs = require('fs');
const { Client, Collection, Intents } = require('discord.js');
const { token } = require('./config.json');

const { GetLastMatchId, GetMatchDetails, GetFunFact, LookupHeroName } = require('./queries.js');
const { 
  GetAllPlayersSteamId,
  GetPlayerLastMatchInfoBySteamId,
  GetRegisteredChannels,
  GetUsersRegisteredToChannel,
  CheckMatchSeen,
  UpdatePlayerLastMatchBySteamId,
  SetRegisteredChannels,
} = require('./player_manager.js');

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

// Given a text channel, produce the broadcast message taking into account
// which other users the message will be relevant to. i.e. they also register
// with that text channel.
const prepare_broadcast = async (match_details, textChannel) => {
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

  // TODO:Stahon add the match ID to a field.

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
  // Get all the registered players we have.
  let allPlayers = await GetAllPlayersSteamId();

  for (player of allPlayers) {
    try {
      // both return {match_id, timestamp}
      let latestMatchData = await GetLastMatchId(player);
      let lastMatchData = await GetPlayerLastMatchInfoBySteamId(player);

      let matchSeenBefore = await CheckMatchSeen(latestMatchData);
      if (matchSeenBefore) {
        // some other player already caused this match to get announced,
      }

      if (latestMatchData.match_id != lastMatchData.match_id) {
        // Sometimes the valve API returns an older match so we have to check
        // timestamp too.
        if (latestMatchData.last_match_timestamp <= lastMatchData.timestamp) {
          // nothing to do here, it's the same match, or an older match.
          if (DEBUG_MODE) {
            console.log(`Player ${player} returned an older match, nothing to do.`);
          }

          continue;
        } else {
          // New match found!
          if (DEBUG_MODE) {
            console.log(`Player ${player} returned a new match!`);
          }

          // We are operating on player at the moment.
          // Get the channels this player is registered to.
          let registered_channels = await GetRegisteredChannels(player);
          
          for (textChannel of registered_channels) {

            // returns { result_array, duration }
            // results array = [ { win, hero_id, kills, deaths, assists, discord_id, steam_id } ]
            let relevant_players = await GetUsersRegisteredToChannel(textChannel.message_channel);
            let match_details = await GetMatchDetails(latestMatchData.match_id, relevant_players);

            let broadcast_message = await prepare_broadcast(match_details);

            await Broadcast(player.steam_id, broadcast_message);

            await RecordNewLastMatch(player.steam_id, new_last_match_id, new_last_match_timestamp);

          }
        
        }

      }

    } catch (e) {
      console.log("something went wrong.");
      console.log(e);
    }
  }


      if (last_match != new_last_match_id) {

      }
    


  await UpdateFunFactMessages();

  // await debugFunction();

  await setTimeout(() => { main(); }, 10000);
}

const RecordNewLastMatch = async (steamId, newLastMatch, newLastMatchTimestamp) => {
  await UpdatePlayerLastMatchBySteamId(steamId, newLastMatch, newLastMatchTimestamp);
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
    if (!message || !message.embeds || !message.embeds[0]) {
      return;
    }

    for (let field of message.embeds[0].fields) {
      // console.log(field);
      if (field.name == FUNFACTFIELDNAME && field.value == DOTDOTDOTLOADING) {
        needsUpdate = true;
        break;
      }
    }

    // console.log(needsUpdate);

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

const Broadcast = async (steamId, broadcast_embed, relevantPlayers) => {
  // returns [{ channel, message snowflake}, ... ]
  let notify_channels = await GetRegisteredChannels(steamId);
  // join any relevant players channels too.

  for (player of relevantPlayers) {
    notify_channels.concat(await GetRegisteredChannels(player));
  }

  let newRegisteredChannels = [];

  for (let channel of notify_channels) {
    let channel_id = channel.channel;

    let text_channel = client.channels.cache.get(channel_id);

    if (DEBUG_MODE) {
      console.log("DEBUGMODE: Send [");
      console.log(broadcast_embed);
      console.log("] to channelID:" + text_channel);
      continue;
    }

    let message = await text_channel.send({ embeds: [broadcast_embed] });
    let messageId = message.id;
    let channel_persistance_data = { channel_id, messageId};
    newRegisteredChannels.push(channel_persistance_data);
  }

  // Update persistance data.
  await SetRegisteredChannels(newRegisteredChannels);
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