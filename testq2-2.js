const net = require('net');
const QW_MASTER_SERVERS = ['master.quakeworld.nu:3000'];//, 'master.quakeservers.net:27000', 'qwmaster.ocrana.de:27000', 'asgaard.morphos-team.net:27000', 'satan.idsoftware.com:27000', 'kubus.rulez.pl:27000'];

async function getServersFromMaster(masterServer) {
 const [host, port] = masterServer.split(':');
 return new Promise((resolve, reject) => {
  const socket = new net.Socket();
  socket.connect(parseInt(port), host, () => {
   socket.write('getservers\n');
  });

  let data = '';
  socket.on('data', chunk => {
   data += chunk.toString();
  });

  socket.on('end', () => {
   const servers = data.split('\n').filter(line => line.trim() !== '').map(line => {
    const [address, port, game, name, players] = line.split(' ');
    return {
     address: address,
     port: parseInt(port),
     game: game,
     name: name,
     players: parseInt(players),
    };
   });
   resolve(servers);
  });

  socket.on('error', error => {
   reject(error);
  });
 });
}

async function getServers() {
 const servers = [];
 for (const masterServer of QW_MASTER_SERVERS) {
  try {
   const masterServersList = await getServersFromMaster(masterServer);
   servers.push(...masterServersList);
  } catch (error) {
   console.error(`Ошибка при получении серверов с ${masterServer}: ${error.message}`);
  }
 }
 return servers;
}

getServers().then(servers => {
 console.log('Список серверов QuakeWorld:');
 console.log(servers);
});
