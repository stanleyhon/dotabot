
const { steamid, dota2key, opendotakey, opendotaId } = require('./config.json');
const heroes = require('./heroes.js');
const axios = require('axios');
const fs = require('fs');
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

  let message = await FunFact(res);

  return message;
}

const GetMatchDetails = async (match_id) => {
  let win = false;
  let duration = 0;
  let damage_taken = 0;
  let kills = 0;
  let deaths = 0;
  let assists = 0;

  let res = await axios.get(
    `https://api.opendota.com/api/matches/${match_id}?api_key=${opendotakey}`);

  duration = res.data.duration / 60;

  // find me and return basic info.
  for (let player of res.data.players) {
    if (player.account_id == opendotaId) {
      win = player.win;
      hero_id = player.hero_id;
  
      kills = player.kills;
      deaths = player.deaths;
      assists = player.assists;
      break;
    }
  }

  return { win, duration, hero_id, kills, deaths, assists };
}

const GetLastMatchId = async () => {
  let res = await axios
    .get(`https://api.steampowered.com/IDOTA2Match_570/GetMatchHistory/V001/?account_id=${steamid}?&key=${dota2key}`);

  for (key in res.data.result.matches) {
    if (res.data.result.matches[key].lobby_type != 12) {
      return res.data.result.matches[key].match_id;
    }
  }

  throw "couldn't find a valid match";
}

module.exports = { GetLastMatchId, GetMatchDetails, GetFunFact, LookupHeroName }