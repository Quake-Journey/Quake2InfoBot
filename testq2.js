const dgram = require('dgram'); 
//import dram from 'dram' ;
const fs = require('fs');
const path = require('path');

const QW_MASTER_SERVERS = ['master.quakeworld.nu:27000'];//, 'master.quakeservers.net:27000', 'qwmaster.ocrana.de:27000', 'asgaard.morphos-team.net:27000', 'satan.idsoftware.com:27000', 'kubus.rulez.pl:27000'];
const CACHE_FILE_PATH = path.join(__dirname, 'server_cache_qw.txt'); 
const USER_CACHE_FILE_PATH = path.join(__dirname, 'user_server_cache_qw.txt');

const COMMAND = Buffer.from([0x63, 0x0a, 0x00]);
const RESPONSE_HEADER = Buffer.from([0xff, 0xff, 0xff, 0xff, 0x64, 0x0a]);

async function getServerList() {
 const serverAddresses = [];

 try {
  const userCacheData = fs.readFileSync(USER_CACHE_FILE_PATH, 'utf-8');
  const userServerAddresses = userCacheData.split('\n').filter(addr => addr.trim());
  serverAddresses.push(...userServerAddresses);
 } catch (error) {
  console.log('Error reading user cache file:', error);
 }

 for (const server of QW_MASTER_SERVERS) {
  const [host, port] = server.split(':');
  console.log(host + ":" + port);
  const socket = dgram.createSocket('udp4');

  socket.on('error', (error) => {
   console.log("Error receiving data from server:", error);
  });

  socket.on('message', (data) => {
   console.log(data);
   const responseBody = data.slice(RESPONSE_HEADER.length);
   const newServerAddresses = parseResponse(responseBody);
   serverAddresses.push(...newServerAddresses);
   socket.close();
  });

  socket.send(COMMAND, 0, COMMAND.length, parseInt(port), host);

  // Ждем, пока обработчик 'message' не сработает
  // Используем блокирующий метод 'on' для синхронной работы
  socket.on('message', () => {}); 
 }

 const uniqueServerAddresses = [...new Set(serverAddresses)];
 }
 fs.writeFileSync(CACHE_FILE_PATH, uniqueServerAddresses.join('\n'), 'utf-8');

 return uniqueServerAddresses;
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

async function main() {
  try {
    const servers = await getServerList();
    console.log("Server list:", servers);
  } catch (error) {
    console.log("Error getting server list:", error);
  }
}

main();
