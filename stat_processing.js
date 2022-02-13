const axios = require('axios');
const { steamid, dota2key, opendotakey, opendotaId } = require('./config.json');

const FunFact = async (opendota_data) => {
  let factFunctions = [
    DamageTakenFF,
    DamageDealtFF,
    TPScrollPurchasedFF
  ];

  let seed = Math.random(); // random between 0-1
  seed = seed * factFunctions.length; // if length is 4, we'll get bween 0 and 4.
  seed -= 1;
  seed = Math.round(seed);
  if (seed < 0) { seed = 0; }

  seed = Math.abs(seed);

  // console.log(seed);
  let funFactMessage = await factFunctions[seed](opendota_data);
  console.log("returning fun message: " + funFactMessage);
  return funFactMessage;
}

const DamageTakenFF = async (opendota_data) => {
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

  let fun_fact = `He took ${damage_taken} total damage and died ${deaths} times.`;
  return fun_fact;
}

const DamageDealtFF = async (opendota_data) => {
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

  let fun_fact = `He dealt ${damage_dealt} total damage and got ${kills} kills.`;
  return fun_fact;
}

const TPScrollPurchasedFF = async (opendota_data) =>  {
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

  let fun_fact = `He purchased ${purchases} TP scrolls costing a total of ${cost} gold.`;
  return fun_fact;
}

const TestFunFact_Main = async () => {

  const res = await axios.get(`https://api.opendota.com/api/matches/6425749320?api_key=${opendotakey}`);

  console.log(await FunFact(res));
}

// TestFunFact_Main();

module.exports = { FunFact }