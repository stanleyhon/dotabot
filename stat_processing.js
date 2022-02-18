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

  let playersInMatch = new Map();
  for (let player of opendota_data.data.players) {
    playersInMatch.set(player.account_id, player.account_id);
  }

  let viable_players = [];
  for (player of known_players.players) {
    if (playersInMatch.get(player.opendota_id)) {
      viable_players.push(player);
    }
  }

  // Pick a known player to find stats for.
  let random_index = await PickAnIndex(viable_players.length);
  let luckyPlayer = viable_players[random_index];


  random_index = await PickAnIndex(factFunctions.length);
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

const TotalStunsFF = async (opendota_data, opendotaId, shortName) => {

}

const BuybacksFF = async (opendota_data, opendotaId, shortName) => {

}

const MaxHeroHitFF = async (opendota_data, opendotaId, shortName) => {

}

const TowerDamageFF = async (opendota_data, opendotaId, shortName) => {

}

const TestFunFact_Main = async () => {

  const res = await axios.get(`https://api.opendota.com/api/matches/6430823518?api_key=${opendotakey}`);

  try {
    console.log(await FunFact(res));
  } catch (e) {
    console.log(e);
  }
}

// TestFunFact_Main();

module.exports = { FunFact }