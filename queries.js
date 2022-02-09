
const { steamid, dota2key, opendotakey, opendotaId } = require('./config.json');
const heroes = require('./heroes.js');
const axios = require('axios');
const fs = require('fs');

function LookupHeroName(hero_id) {
  for (hero of heroes) {
    if (hero.id == hero_id) {
      return hero.localized_name;
    }
  }
}

const UpdateDamageFromOpenDota = async () => {
  match_id = fs.readFileSync('./last_match.data', 'utf-8');
  const res = await axios.get(`https://api.opendota.com/api/matches/${match_id}?api_key=${opendotakey}`);

  // find me.
  let damage_taken = 0;
  for (let player of res.data.players) {
    if (player.account_id == opendotaId) {

      for (source in player.damage_taken) {
        damage_taken += player.damage_taken[source];
      }
    }
  }

  return damage_taken;
}

let opendota_retries = 15;
const GetMatchDetails = async (match_id) => {
  let win = false;
  let duration = 0;
  let hero = 0;
  let damage_taken = 0;
  let deaths = 0;

  let res = await axios.get(
    `https://api.opendota.com/api/matches/${match_id}?api_key=${opendotakey}`);

  duration = res.data.duration / 60;

  // find me.
  for (let player of res.data.players) {
    if (player.account_id == opendotaId) {
      win = player.win;
      hero_id = player.hero_id;
      for (source in player.damage_taken) {
        damage_taken += player.damage_taken[source];
      }

      if (damage_taken == 0) {
        // opendota doesn't have the damage yet, delay by throwing.
        throw "no damage data yet, try again...."
      }

      deaths = player.deaths;
      break;
    }
  }

  return { win, duration, hero_id, damage_taken, deaths};
}

const GetLastMatchId = async () => {
  let res = await axios
    .get(`https://api.steampowered.com/IDOTA2Match_570/GetMatchHistory/V001/?account_id=${steamid}?&key=${dota2key}`);

  return res.data.result.matches[0].match_id;
}

module.exports = { GetLastMatchId, GetMatchDetails, UpdateDamageFromOpenDota, LookupHeroName }