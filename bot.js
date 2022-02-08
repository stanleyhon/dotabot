// Require the necessary discord.js classes
const fs = require('fs');
const { Client, Collection, Intents } = require('discord.js');
const { token } = require('./config.json');

const { query_dota } = require('./queries.js');

let TEXT_CHANNEL_ID = "940008295022874679";

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

// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log('Ready!');
    client.user.setActivity('Dota 2', { type: 'PLAYING' });
    
    query_dota();
    update_message_if_necessary();
    setTimeout(() => {  run_loop();  }, 60000);
});

const update_message_if_necessary = async () => {
  let last_message = fs.readFileSync('./last_message.data', 'utf-8');
  let text_channel = client.channels.cache.get(TEXT_CHANNEL_ID);
  message = await text_channel.messages.fetch(last_message);

  console.log(message);
  if (message && message.content && message.content.search("...loading...") != -1) {
    console.log("found a placeholder");
    new_damage = await update_damage_from_opendota();
    if (new_damage != 0) {
      new_message = message.content.replace("...loading...", new_damage);
    }
    message.edit(new_message);
  }
}

// // wait for delayMs milliseconds
// const sleep = (delayMs) => { 
//   return new Promise((resolve, reject) => {
//     setTimeout(() => { resolve() }, delayMs)
//   })
// }

// // poll every intervalMs up to maxRetries
// // times for the async fn to not throw
// const poll = async (maxRetries, intervalMs, fn) => {
//   let retries = 0, data = null
//   while (retries < maxRetries && !data) {
//     try { 
//       data = await fn()
//       return data
//     } catch (e) {
//       retries++
//       await sleep(intervalMs)
//     }
//   }
//   return null
// }

// const getMatchDetails = async () => {
//   const url = `TODO/${matchId}`
//   const res = await axios.get(url)
//   // todo: format result 
//   return {}
// }

// const getLastMatch = async () => {
//   const url = `TODO`
//   const res = await axios.get(url)
//   // todo: format result
//   return {}
// }

// const main = async () => {
//   const match = await getLastMatch()
//   if (match.id != savedMatch.id) {
//     const matchDetails = await poll(
//       10, // retry 10 times
//       10000, // wait 10s between poll
//       () => getMatchDetails(match.id))
//     if (matchDetails) {
//       // do stuff
//     }
//   }
// }

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