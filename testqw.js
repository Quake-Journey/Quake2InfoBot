const dgram = require('dgram');
const fs = require('fs');
const path = require('path');

const QW_MASTER_SERVERS = ['master.quakeworld.nu:27000', 'master.quakeservers.net:27000', 'qwmaster.ocrana.de:27000', 'asgaard.morphos-team.net:27000', 'satan.idsoftware.com:27000', 'kubus.rulez.pl:27000'];
//const QW_MASTER_SERVERS = ['kubus.rulez.pl:27000'];
const CACHE_FILE_PATH = path.join(__dirname, 'server_cache_qw.txt');
const USER_CACHE_FILE_PATH = path.join(__dirname, 'user_server_cache_qw.txt');

const COMMAND = Buffer.from([0x63, 0x0a, 0x00]);
const RESPONSE_HEADER = Buffer.from([0xff, 0xff, 0xff, 0xff, 0x64, 0x0a]);

const TIMEOUT = 2000; // Таймаут в миллисекундах

async function getServerListFromMS(server) {
  const [host, port] = server.split(':');
  console.log(host + ':' + port);
  const serverAddresses = [];
 
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');

    const timeoutId = setTimeout(() => {
      socket.close();
      reject(new Error(`Timeout for ${host}:${port}`));
    }, TIMEOUT);

    socket.on('error', reject);
    socket.on('message', (data) => {
      clearTimeout(timeoutId); // Удаляем таймаут, если получен ответ
      const responseBody = data.subarray(RESPONSE_HEADER.length);
      const serverAddresses = parseResponse(responseBody);
      socket.close();
      resolve(serverAddresses);
    });

    socket.send(COMMAND, 0, COMMAND.length, parseInt(port), host);
  });
}

function parseResponse(responseBody) {
  const serverAddresses = [];
  let offset = 0;

  while (offset < responseBody.length) {
    const ipParts = responseBody.slice(offset, offset + 4);
    const port = responseBody.readUInt16BE(offset + 4);

    const ip = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.${ipParts[3]}`;
    serverAddresses.push(`${ip}:${port}`);

    offset += 6;
  }

  serverAddresses.sort();
  return serverAddresses;
}

async function getServerList() {
  const serverAddresses = [];
  try {
    //let servers = [];
    try {
      const userCacheData = fs.readFileSync(USER_CACHE_FILE_PATH, 'utf-8');
      const userServerAddresses = userCacheData.split('\n').filter(addr => addr.trim());
      serverAddresses.push(...userServerAddresses);
      const newServerAddresses = [];
    } catch (error) {
      console.log('Error reading user cache file:', error);
    }
    for (const server of QW_MASTER_SERVERS) {
      try {
        const newServerAddresses = await getServerListFromMS(server);
        console.log("Server list:", newServerAddresses);
        serverAddresses.push(...newServerAddresses);
      } catch (error) {
        console.error("Error getting server list:", error);
      }
    }
    const uniqueServerAddresses = [...new Set(serverAddresses)];
    fs.writeFileSync(CACHE_FILE_PATH, uniqueServerAddresses.join('\n'), 'utf-8');
  } catch (error) {
    console.error("Error getting server list:", error);
  }
}


async function main() {
  await getServerList();
}

main();

