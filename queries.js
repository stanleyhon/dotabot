
const { steamid, dota2key, opendotakey, opendotaId } = require('./config.json');
const heroes = require('./heroes.js');
const axios = require('axios');
const fs = require('fs');
const known_players = require('./known_players.json');
const { FunFact } = require('./stat_processing');

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
// results array = [ { win, hero_id, kills, deaths, assists, discord_id } ]
const GetMatchDetails = async (match_id) => {
  let res = await axios.get(
    `https://api.opendota.com/api/matches/${match_id}?api_key=${opendotakey}`);

  let opendota_id_map = new Map();
  for (player of known_players.players) {
    // console.log("adding " + player.opendota_id + "|" + player.discord_id)
    opendota_id_map.set(player.opendota_id, player.discord_id);
  }

  let duration = res.data.duration / 60;
  let results_array = [];

  // find me and return basic info.
  for (let player of res.data.players) {
    if (opendota_id_map.has(player.account_id)) {
      let win = player.win;
      let hero_id = player.hero_id;
      let kills = player.kills;
      let deaths = player.deaths;
      let assists = player.assists;
      let discord_id = opendota_id_map.get(player.account_id);
      results_array.push(
        { win, hero_id, kills, deaths, assists, discord_id });
    }
  }

  return { results_array, duration };
}

const GetLastMatchId = async () => {
  let res = await axios
    .get(`https://api.steampowered.com/IDOTA2Match_570/GetMatchHistory/V001/?account_id=${steamid}?&key=${dota2key}`);

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