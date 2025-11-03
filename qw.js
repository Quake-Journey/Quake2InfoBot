const fetch = require('node-fetch').default; // Используйте .default
const dgram = require('dgram');
const fs = require('fs'); // Импортируем модуль для работы с файлами
const path = require('path');
const quakeworld = require('./quakeworld');

const CACHE_FILE_PATH = path.join(__dirname, 'server_cache_qw.txt'); // Путь к кэш-файлу
const CACHE_FILE_PATH_ALL = path.join(__dirname, 'server_cache_qw_all.txt'); // Путь к кэш-файлу
const USER_CACHE_FILE_PATH = path.join(__dirname, 'user_server_cache_qw.txt'); // Путь к кэш-файлу
const CACHE_UPDATE_INTERVAL = 60 * 60 * 1000; // 1 час в миллисекундах
const TIMEOUT = 5000; // Таймаут в миллисекундах
const COMMAND = Buffer.from([0x63, 0x0a, 0x00]);
const RESPONSE_HEADER = Buffer.from([0xff, 0xff, 0xff, 0xff, 0x64, 0x0a]);

//const QW_MASTER_SERVERS = ['master.quakeworld.nu:27000', 'master.quakeservers.net:27000', 'qwmaster.ocrana.de:27000', 'asgaard.morphos-team.net:27000', 'satan.idsoftware.com:27000', 'kubus.rulez.pl:27000'];
//QTV WEB: https://hub.quakeworld.nu/qtv/?address=95.216.18.118:28003

const QW_MASTER_SERVERS = ['master.quakeworld.nu:27000'];//, 'master.quakeservers.net:27000', 'qwmaster.ocrana.de:27000', 'asgaard.morphos-team.net:27000', 'satan.idsoftware.com:27000', 'kubus.rulez.pl:27000'];
//https://hubapi.quakeworld.nu/v2/servers

// Функция для обновления кэша
async function updateCache() {
  try {
    console.log('Обновление кэша серверов QuakeWorld...');
    //const response = await fetch('http://q2servers.com/?raw=1');
    //const data = await response.text();
    const uniqueServerAddresses = await getUpdatedServerList();
    //await fs.writeFile(CACHE_FILE_PATH, data);
    if (uniqueServerAddresses && uniqueServerAddresses.length > 0) {
      fs.writeFileSync(CACHE_FILE_PATH, uniqueServerAddresses.join('\n'), 'utf-8');
      console.log('Кэш серверов QuakeWorld обновлен');
    }
    else {
      console.log('Обновления файла кэша не произведено - отсутствуют новые данные');
    }

  } catch (error) {
    console.log('Ошибка при обновлении кэша серверов QuakeWorld:', error);
  }
}

/* --------------------------------------------------------------------------------------------------------------------------------------------------------*/

// Функция для получения списка серверов с кэша и доп. файла

async function getServerList() {
  const serverAddresses = [];
  
  // Чтение пользовательского кэша
  try {
    const userCacheData = fs.readFileSync(USER_CACHE_FILE_PATH, 'utf-8');
    const userServerAddresses = userCacheData.split('\n').filter(addr => addr.trim());
    serverAddresses.push(...userServerAddresses.map(addr => addr.trim()));
  } catch (error) {
    console.log('Ошибка чтения дополнительного файла с серверами QuakeWorld:', error);
  }

  // Чтение кэша
  try {
    const cacheData = fs.readFileSync(CACHE_FILE_PATH, 'utf-8');
    const cacheServerAddresses = cacheData.split('\n').filter(addr => addr.trim());
    serverAddresses.push(...cacheServerAddresses.map(addr => addr.trim()));
  } catch (error) {
    console.log('Ошибка чтения файла кэша серверов QuakeWorld:', error);
  }

  // Получаем уникальные адреса
  const uniqueServerAddresses = [...new Set(serverAddresses)];
  
  // Записываем уникальные адреса в файл
  fs.writeFileSync(CACHE_FILE_PATH_ALL, uniqueServerAddresses.join('\n'), 'utf-8');
  
  return uniqueServerAddresses;
}

async function getServerList2313131() {
  const serverAddresses = [];
  try {
    //let servers = [];
    try {
      const userCacheData = fs.readFileSync(USER_CACHE_FILE_PATH, 'utf-8');
      const userServerAddresses = userCacheData.split('\n').filter(addr => addr.trim());
      serverAddresses.push(...userServerAddresses);
      const newServerAddresses = [];
    } catch (error) {
      console.log('Ошибка чтения дополнительного файла с серверами QuakeWorld:', error);
    }

    try {
      const CacheData = fs.readFileSync(CACHE_FILE_PATH, 'utf-8');
      const cacheServerAddresses = CacheData.split('\n').filter(addr => addr.trim());
      serverAddresses.push(...cacheServerAddresses);
    } catch (error) {
      console.log('Ошибка чтения файла кэша серверов QuakeWorld:', error);
    }

    const uniqueServerAddresses = [...new Set(serverAddresses)];
    return uniqueServerAddresses;
  } catch (error) {
    console.log("Error getting server list:", error);
  }
}

/* --------------------------------------------------------------------------------------------------------------------------------------------------------*/

// Функция для получения списка серверов по всем MS (Master servers)
async function getUpdatedServerList() {
  const serverAddresses = [];
  try {
    for (const server of QW_MASTER_SERVERS) {
      try {
        const newServerAddresses = await getServerListFromMS(server);
        //console.log("Server list:", newServerAddresses);
        serverAddresses.push(...newServerAddresses);
      } catch (error) {
        console.log("Error getting server list:", error);
      }
    }
    const uniqueServerAddresses = [...new Set(serverAddresses)];
    return uniqueServerAddresses;
  } catch (error) {
    console.log("Error getting server list:", error);
  }
}

/* --------------------------------------------------------------------------------------------------------------------------------------------------------*/

// Функция для получения списка серверов из мастер-сервера
async function getServerListFromMS(server) {
  const [host, port] = server.split(':');
  //console.log(host + ':' + port);
  const serverAddresses = [];

  //return new Promise((resolve, reject) => {

  return queryServerMS(host, port);

  //});
}


/* --------------------------------------------------------------------------------------------------------------------------------------------------------*/

async function queryServerMS(host, port) {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');

    let timeoutId = setTimeout(() => {
      socket.close(); // Закрываем сокет при таймауте
      reject(new Error(`Timeout for ${host}:${port}`));
    }, TIMEOUT);

    socket.on('error', (err) => {
      clearTimeout(timeoutId); // Удаляем таймаут при ошибке
      socket.close(); // Закрываем сокет при ошибке
      reject(err); // Передаем ошибку
    });

    socket.on('message', async (data) => {
      clearTimeout(timeoutId);
      const responseBody = data.subarray(RESPONSE_HEADER.length);
      const serverAddresses = parseResponse(responseBody);
      socket.close(); // Закрываем сокет после получения ответа
      resolve(serverAddresses);
    });

    socket.send(COMMAND, 0, COMMAND.length, parseInt(port), host, (err) => {
      if (err) {
        // clearTimeout(timeoutId); // Удаляем clearTimeout, мы уже делаем это в socket.on('error')
        // socket.close(); // Удаляем socket.close(), мы уже делаем это в socket.on('error')
        // reject(err); // Удаляем reject, мы уже делаем это в socket.on('error')
        return;
      }
    });
  });
}


/* --------------------------------------------------------------------------------------------------------------------------------------------------------*/

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

/* --------------------------------------------------------------------------------------------------------------------------------------------------------*/

async function queryServer(serverIp, serverPort) {
  return new Promise((resolve, reject) => {
    //const serverInfo = {};
    //const players = [];
    //serverInfo['serverIp'] = serverIp;
    //serverInfo['serverPort'] = serverPort;
    //const response = { serverInfo, players };
    try {
      const response = parseQWResponse(serverIp, serverPort);
      resolve(response);
    }
    catch (error) {
      //console.log("Error queryServer (qw) :", error);
      reject(new Error('ERROR queryServer (qw) : ', err));
    }

  });
}

/* --------------------------------------------------------------------------------------------------------------------------------------------------------*/

function parseQWResponse(host, port) {
  return new Promise((resolve, reject) => {
    let serverInfo = {};
    let players = [];
    try {
      serverInfo['serverIp'] = host;
      serverInfo['serverPort'] = port;

      // Используем Promise для обработки ответа от quakeworld
      quakeworld(host, port, 'status', [31], (err, data) => {
        if (err) {
          //console.log('ERROR parseQWResponse: ', err);
          reject(err); // Передаем ошибку в Promise
        } else {
          // Раскладываем значения из корня объекта DATA
          for (const key in data) {
            if (key !== 'players') {
              if (key.toLowerCase() == 'map') serverInfo['mapname'] = data[key];
              else serverInfo[key] = data[key];
            }
          }
          // Раскладываем значения из массива players
          for (const playerData of data.players) {
            const player = {};
            for (const key in playerData) {
              if (key == 'score' && playerData[key] === 'S') player['score'] = 'Spectator';
              else player[key] = playerData[key];
            }
            players.push(player);
          }
          //console.log('DATA: ', data);
          resolve({ serverInfo, players }); // Передаем результат в Promise
        }
      });
    } catch (error) {
      //console.log("Error parseQWResponse :", error);
      reject(error); // Передаем ошибку в Promise
    }
  });
}

/* --------------------------------------------------------------------------------------------------------------------------------------------------------*/

async function startUpdateServersList() {
  try {
    // Запускаем обновление кэша раз в час
    setInterval(updateCache, CACHE_UPDATE_INTERVAL);

    // Инициализируем кэш при старте приложения
    updateCache();
  } catch (error) {console.log('startUpdateServersList error:',startUpdateServersList)}
}

/* --------------------------------------------------------------------------------------------------------------------------------------------------------*/

module.exports = { getServerListQW: getServerList, queryServerQW: queryServer, startUpdateServersListQW: startUpdateServersList};