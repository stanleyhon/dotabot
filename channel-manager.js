const fs = require('fs');

const ReadChannelData = async () => {
  let data = fs.readFileSync('./announced_matches.json', 'utf-8');
  let jsonData = await JSON.parse(data);
  return jsonData;
}

const WriteChannelData = async (data) => {
  let stringJson = await JSON.stringify(data);
  fs.writeFileSync('./announced_matches.json', stringJson);
}

// add match
const AddAnnouncedMatch = async (channelId, matchId) => {
  let channelData = await ReadChannelData();
  console.log(typeof(channelData));
  if (channelData.hasOwnProperty(channelId.toString())) {
    let announcedMatches = channelData[channelId.toString()];
    if (announcedMatches.length > 20) {
      announcedMatches.shift(); // remove the first
    }

    announcedMatches.push(matchId);
  }

  await WriteChannelData(channelData);
} 

// check for match
const CheckForAnnouncedMatch = async (channelId, matchId) => {
  let channelData = await ReadChannelData();
  if (channelData.hasOwnProperty(channelId.toString())) {
    let announcedMatches = channelData[channelId.toString()];
    for (match of announcedMatches) {
      if (match == matchId) {
        return true;
      }
    }
  }
  return false;
}

const debugmain = async () => {
  console.log(await ReadChannelData());

  await AddAnnouncedMatch("940008295022874679", 6969);

  console.log(await ReadChannelData());

  console.log(await CheckForAnnouncedMatch("940008295022874679", 6969));
}

// debugmain();