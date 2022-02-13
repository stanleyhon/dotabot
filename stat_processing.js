const axios = require('axios');
const known_players = require('./known_players.json');
const { steamid, dota2key, opendotakey, opendotaId } = require('./config.json');

const PickAnIndex = async (max_index) => {
  let seed = Math.floor(Math.random() * max_index)
  return seed;
}

const FunFact = async (opendota_data) => {
  let factFunctions = [
    DamageTakenFF,
    DamageDealtFF,
    TPScrollPurchasedFF
  ];


  let random_index = await PickAnIndex(known_players.players.length - 1);

  // Pick a known player to find stats for.
  let luckyPlayer = known_players.players[random_index];

  let found = false;
  for (let player of opendota_data.data.players) {
    if (luckyPlayer.opendota_id == player.account_id) {
      found = true;
      break;
    }
  }

  if (!found) {
    throw "player not in this game, trying again later.";
  }

  // console.log(seed);
  random_index = await PickAnIndex(factFunctions.length - 1);
  console.log(random_index);
  let funFactMessage = await factFunctions[random_index](opendota_data, luckyPlayer.opendota_id, luckyPlayer.name);
  console.log("returning fun message: " + funFactMessage);
  return funFactMessage;
}

const DamageTakenFF = async (opendota_data, opendotaId, shortName) => {
  let damage_taken = 0;
  let deaths = 0;
  for (let player of opendota_data.data.players) {
    if (player.account_id == opendotaId) {

      for (source in player.damage_taken) {
        if (source.indexOf(`npc_dota_hero`) == 0) {
          // console.log(source);
          // console.log(player.damage_taken[source]);
          damage_taken += player.damage_taken[source];
        }
      }
      deaths = player.deaths;
    }
  }

  if (damage_taken == 0) {
    throw "OpenDota not ready.";
    // OD isn't ready, just throw.
  }

  let fun_fact = `${shortName} took ${damage_taken} total damage and died ${deaths} times.`;
  return fun_fact;
}

const DamageDealtFF = async (opendota_data, opendotaId, shortName) => {
  let damage_dealt = 0;
  let kills = 0;

  for (let player of opendota_data.data.players) {
    if (player.account_id == opendotaId) {


      for (source in player.damage) {
        if (source.indexOf(`npc_dota_hero`) == 0) {
          // console.log(source);
          // console.log(player.damage[source]);
          damage_dealt += player.damage[source];
        }
      }
      kills = player.kills;
    }
  }

  if (damage_dealt == 0) {
    throw "OpenDota not ready.";
    // OD isn't ready, just throw.
  }

  let fun_fact = `${shortName} dealt ${damage_dealt} total damage and got ${kills} kills.`;
  return fun_fact;
}

const TPScrollPurchasedFF = async (opendota_data, opendotaId, shortName) =>  {
  let purchases = 0;

  for (let player of opendota_data.data.players) {
    if (player.account_id == opendotaId) {
      purchases = player.purchase_tpscroll;
    }
  }

  if (purchases == undefined) {
    throw "OpenDota not ready.";
    // OD isn't ready, just throw.
  }

  let cost = purchases * 100;

  let fun_fact = `${shortName} purchased ${purchases} TP scrolls costing a total of ${cost} gold.`;
  return fun_fact;
}

const TestFunFact_Main = async () => {

  const res = await axios.get(`https://api.opendota.com/api/matches/6425749320?api_key=${opendotakey}`);

  console.log(await FunFact(res));
}

// TestFunFact_Main();

module.exports = { FunFact }