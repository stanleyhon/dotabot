
const { dota2key, opendotakey } = require('./config.json');
const heroes = require('./heroes.js');
const axios = require('axios');
const fs = require('fs');
const known_players = require('./known_players.json');
const { FunFact } = require('./stat_processing');
const {   SteamIdToOpenDiscordId,
  SteamIdToOpenDotaId } = require('./player_manager')

function LookupHeroName(hero_id) {
  for (hero of heroes) {
    if (hero.id == hero_id) {
      return hero.localized_name;
    }
  }
}

const GetFunFact = async () => {
  match_id = fs.readFileSync('./last_match.data', 'utf-8');
  const res = await axios.get(`https://api.opendota.com/api/matches/${match_id}?api_key=${opendotakey}`);

  let message;
  try {
    message = await FunFact(res);
  } catch (e) {
    throw e;
  }

  return message;
}

// returns { result_array, duration }
// results array = [ { win, hero_id, kills, deaths, assists, discord_id, steam_id } ]
const GetMatchDetails = async (match_id, relevant_players) => {
  let res = await axios.get(
    `https://api.opendota.com/api/matches/${match_id}?api_key=${opendotakey}`);

  let opendotaIdMap = new Map();
  for (player of relevant_players) {
    // console.log("adding " + player.opendota_id + "|" + player.discord_id)
    let opendota_id = await SteamIdToOpenDotaId(player);
    let discord_id = await SteamIdToOpenDiscordId(player);
    opendotaIdMap.set(opendota_id, discord_id);
  }

  let duration = res.data.duration / 60;
  let results_array = [];

  // find me and return basic info.
  for (let player of res.data.players) {
    if (opendotaIdMap.has(player.account_id)) {
      let win = player.win;
      let hero_id = player.hero_id;
      let kills = player.kills;
      let deaths = player.deaths;
      let assists = player.assists;
      let discord_id = opendota_id_map.get(player.account_id);
      let steamId = player.account_id;
      results_array.push(
        { win, hero_id, kills, deaths, assists, discord_id, steamId});
    }
  }

  return { results_array, duration };
}

const GetLastMatchId = async (steamId) => {
  let res = await axios
    .get(`https://api.steampowered.com/IDOTA2Match_570/GetMatchHistory/V001/?account_id=${steamId}?&key=${dota2key}`);

  for (key in res.data.result.matches) {
    if (res.data.result.matches[key].lobby_type != 12) {
      let match_id = res.data.result.matches[key].match_id;
      let timestamp = res.data.result.matches[key].start_time;
      return {match_id, timestamp};
    }
  }

  throw "couldn't find a valid match";
}

module.exports = { GetLastMatchId, GetMatchDetails, GetFunFact, LookupHeroName }