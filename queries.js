
const { steamid, dota2key, opendotakey, opendotaId } = require('./config.json');
const heroes = require('./heroes.js');
const axios = require('axios');
const fs = require('fs');

// dev server, general:

let DOTDOTDOTLOADING = "...loading...";

function lookup_hero_name(hero_id) {
  for (hero of heroes) {
    if (hero.id == hero_id) {
      return hero.localized_name;
    }
  }
}

const update_damage_from_opendota = async () => {
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
function query_opendota(match_id) {
  let win = false;
  let duration = 0;
  let hero = 0;
  let damage_taken = 0;
  let deaths = 0;

  axios
    .get(`https://api.opendota.com/api/matches/${match_id}?api_key=${opendotakey}`)
    .then(res => {

      duration = res.data.duration / 60;

      // find me.
      for (let player of res.data.players) {
        if (player.account_id == opendotaId) {
          win = player.win;
          hero = player.hero_id;
          console.log(player);
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

      let didWin = (win ? 'won' : 'lost');
      let announcement = `Stanley ` + didWin + ` a match as ` +
        lookup_hero_name(hero) + ' in ' + Math.floor(duration).toString() + ' minutes. He took '
        + (damage_taken == 0 ? DOTDOTDOTLOADING : damage_taken) + ' damage and died ' + deaths + ' times.';
      let a_channel_id = client.channels.cache.get(TEXT_CHANNEL_ID);
      a_channel_id.send(announcement).
        then(
          message => fs.writeFileSync('./last_message.data', message.id.toString())
        );

      console.log(announcement);

      // Since we posted, update bookkeeping.
      fs.writeFileSync('./last_match.data', match_id.toString());
      last_match = match_id;
    })
    .catch(error => {
      console.error(error);
      // probably don't have match data yet, try again in 1 min.
      if (opendota_retries <= 0) {
        console.log("gave up on opendota");
        // ran out of retries, give up.
        opendota_retries = 10;
      } else {
        console.log("error querying opendota, retrying in a min.")
        opendota_retries--;
        setTimeout(() => { query_opendota(match_id); }, 60000);
      }
    })
}

// fix these queries to do 1 thing man
// use the await thing
let last_match = fs.readFileSync('./last_match.data', 'utf-8');
let new_last_match;
function query_dota() {
  axios
    .get(`https://api.steampowered.com/IDOTA2Match_570/GetMatchHistory/V001/?account_id=${steamid}?&key=${dota2key}`)
    .then(res => {
      // console.log(res.data.result.matches[0]);
      new_last_match = res.data.result.matches[0].match_id;

      if (last_match != new_last_match) {
        query_opendota(new_last_match);
      } else {
        console.log("no new match found.");
      }

    })
    .catch(error => {
      console.error(error);
    })
}

module.exports = { query_dota, query_opendota, update_damage_from_opendota, lookup_hero_name }