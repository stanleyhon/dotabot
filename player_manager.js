const fs = require('fs');

// private:
const ReadKnownPlayers = async () => {
  let knownPlayersFile = fs.readFileSync('./known_players.json', 'utf-8');
  let jsonData = await JSON.parse(knownPlayersFile);
  return jsonData;
}

const UpdateKnownPlayers = async (jsonData) => {
  let stringJson = await JSON.stringify(jsonData);
  fs.writeFileSync('./known_players.json', stringJson);
}

// public:
// returns {last_match_id, last_match_timestamp}
const GetPlayerLastMatchInfoBySteamId = async (steamId) => {
  let jsonData = await ReadKnownPlayers();

  // find the player:
  for (player of jsonData.players) {
    if (player.steam_id == steamId) {
      let lastMatchId = player.last_match_id;
      if (!lastMatchId) {
        lastMatchId = 0;
      }
      let lastMatchTimestamp = player.last_match_timestamp;
      if (!lastMatchTimestamp) {
        lastMatchTimestamp = 0;
      }

      return { lastMatchId, lastMatchTimestamp};
    }
  }

  throw "could not find player " + steamId;
}

const UpdatePlayerLastMatchBySteamId = 
  async (steamId, lastMatchId, lastMatchTimestamp) => {
    let jsonData = await ReadKnownPlayers();

    // find the player:
    for (player of jsonData.players) {
      if (player.steam_id == steamId) {
        player.last_match_id = lastMatchId;
        player.last_match_timestamp = lastMatchTimestamp;
        await UpdateKnownPlayers(jsonData);
        return;
      }
    }

    throw "could not find player " + opendota_id;
}

// returns true or false
const CheckMatchSeen = async (matchId) => {
  let jsonData = await ReadKnownPlayers();

  for (player of jsonData.players) {
    if (player.last_match_id == matchId) {
      return true;
    }
  }

  return false;
}

// returns [ steam_id, steam_id2, ... ]
const GetAllPlayersSteamId = async () => {
  let jsonData = await ReadKnownPlayers();
  let results = [];

  for (player of jsonData.players) {
    if (player.steam_id) {
      results.push(player.steam_id);
    }
  }

  return results;
}

// returns [ { message_channel, message_snowflake }, { ... }, ... ]
const GetRegisteredChannels = async (steamId) => {
  let jsonData = await ReadKnownPlayers();

  // find the player:
  for (player of jsonData.players) {
    if (player.steam_id == steamId) {
      return player.related_messages;
    }
  }

  throw "GetRelatedMessages: couldn't find steamId";
}

// send [ { message_channel(string), snowflake(string) }, ... ]
const SetRegisteredChannels = async (steamId, data) => {
  let jsonData = await ReadKnownPlayers();

  // find the player:
  for (player of jsonData.players) {
    if (player.steam_id == steamId) {
      player.related_messages = data;
      await UpdateKnownPlayers(jsonData);
      return;
    }
  }

  throw "could not find steamId " + steamId;
}

const GetUsersRegisteredToChannel = async (channelId) => {
  let users = [];

  let jsonData = await ReadKnownPlayers();

  for (player of jsonData.players) {
    for (registeredChannel of player.registered_channels) {
      if (registeredChannel == channelId) {
        users.push(player.steam_id);
      }
    }
  }

  return users;
}

const SteamIdToOpenDotaId = async (steamId) => {
  let jsonData = await ReadKnownPlayers();

  for (player of jsonData.players) {
    if (player.steam_id == steamId) {
      return player.opendota_id;
    }
  }

  throw "couldn't find an opendota_id for steamid " + steamId;
}

const SteamIdToOpenDiscordId = async (steamId) => {
  let jsonData = await ReadKnownPlayers();

  for (player of jsonData.players) {
    if (player.steam_id == steamId) {
      return player.discord_id;
    }
  }

  throw "couldn't find an discord_id for steamid " + steamId;
}

const debugmain = async () => {

  let data = await GetRelatedMessages("76561197973395293");

  data[0].message_channel = "555555";

  await SetRelatedMessages("76561197973395293", data);

  console.log(await GetAllPlayersSteamId());
}

// TODO: Add messages to the known_players schema, so that we can update the
// messages later.

debugmain();

module.exports = { 
  GetAllPlayersSteamId,
  GetPlayerLastMatchInfoBySteamId,
  GetRegisteredChannels,
  GetUsersRegisteredToChannel,
  CheckMatchSeen,
  UpdatePlayerLastMatchBySteamId,
  SetRegisteredChannels,
  SteamIdToOpenDiscordId,
  SteamIdToOpenDotaId
};