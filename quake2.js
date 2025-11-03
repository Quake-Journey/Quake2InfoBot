const fetch = require('node-fetch').default; // Используйте .default
const dgram = require('dgram');
const fs = require('fs').promises; // Импортируем модуль для работы с файлами
const path = require('path');

const CACHE_FILE_PATH = path.join(__dirname, 'server_cache_q2.txt'); // Путь к кэш-файлу
const USER_CACHE_FILE_PATH = path.join(__dirname, 'user_server_cache_q2.txt'); // Путь к кэш-файлу
const CACHE_UPDATE_INTERVAL = 60 * 60 * 1000; // 1 час в миллисекундах

// Функция для обновления кэша
async function updateCache() {
  try {
    console.log('Обновление кэша серверов Quake2...');
    const response = await fetch('http://q2servers.com/?raw=1');
    const data = await response.text();
    await fs.writeFile(CACHE_FILE_PATH, data);
    console.log('Кэш серверов Quake2 обновлен');
  } catch (error) {
    console.log('Ошибка при обновлении кэша серверов Quake2:', error);
  }
}

// Функция для получения списка серверов с кэшированием
async function getServerList() {
  try {
    let data;
    let data2;
    let servers1;
    let servers2;
    let combinedServers;
    //console.log('getServerList');
    // Проверяем наличие кэш-файла
    try {
      data = await fs.readFile(CACHE_FILE_PATH, 'utf-8');
    } catch (error) {
      console.log('Кэш-файл серверов Quake2 не найден или не доступен, обновляем кэш...');
    }

    // Если кэш-файл пустой или не существует, обновляем кэш
    if (!data || data.trim() === '') {
      await updateCache();
      data = await fs.readFile(CACHE_FILE_PATH, 'utf-8');
    }

    try {
      data2 = await fs.readFile(USER_CACHE_FILE_PATH, 'utf-8');
    } catch (error) {
      console.log('Пользовательский файл со списком серверов Quake2 не найден, пропуск.');
      data2 = undefined;
    }

    servers1 = data.split('\n').filter(Boolean);
    //console.log(servers1);

    if (data2 != undefined) {
      //console.log('!!!');
      servers2 = data2.split('\n').filter(Boolean);
      combinedServers = Array.from(new Set([servers1, servers2])).join('\n').trim().split(',');
      //combinedServers = combinedServers.split(',');
    } else combinedServers = servers1;

    //console.log('Сервера Quake2 получены из кэша');
    //console.log(combinedServers);
    //console.log(combinedServers);
    return [...new Set(combinedServers)];//;.split(',');

  } catch (error) {
    console.log('Ошибка в функции getServerList (q2):', error);
    throw error; // Пробрасываем ошибку дальше
  }
}

async function startUpdateServersList() {
  try {
    // Запускаем обновление кэша раз в час
    setInterval(updateCache, CACHE_UPDATE_INTERVAL);

    // Инициализируем кэш при старте приложения
    updateCache();
  } catch (error) {console.log('startUpdateServersList error:',startUpdateServersList)}
}

/* --------------------------------------------------------------------------------------------------------------------------------------------------------*/

async function queryServer(serverIp, serverPort) {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    const request = Buffer.from([0xff, 0xff, 0xff, 0xff, ...Buffer.from('status\n')]);

    const timeout = setTimeout(() => {
      reject(new Error('Запрос к серверу Quake2 превысил лимит времени'));
      socket.close();
    }, 3000); // Установите таймаут на 1 секунду

    socket.send(request, 0, request.length, serverPort, serverIp, (err) => {
      if (err) {
        clearTimeout(timeout);
        reject(err);
        socket.close();
        return;
      }
    });

    socket.on('message', (message) => {
      clearTimeout(timeout);
      const response = parseQuake2Response(message, serverIp, serverPort);
      resolve(response);
      socket.close();
    });

    socket.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
      socket.close();
    });
  });
}

/* --------------------------------------------------------------------------------------------------------------------------------------------------------*/

function parseQuake2Response(data, serverIp, serverPort) {
  //console.log(data.toString());
  const serverInfo = {};
  const players = [];
  try {
    const lines = data.toString().split('\n');
    const line = lines[1] ? lines[1].trim() : '';
    const keyValuePairs = line.substring(6).split('\\');
    //console.log('keyValuePairs.length='+keyValuePairs.length.toString());

    serverInfo['serverIp'] = serverIp;
    serverInfo['serverPort'] = serverPort;
    for (let j = 0; j < keyValuePairs.length; j += 2) {
      if (keyValuePairs[j + 1]) {
        const key = keyValuePairs[j].trim();
        const value = keyValuePairs[j + 1].trim();
        serverInfo[key] = value;
      } else {
        console.log('Не удалось извлечь пару ключ-значение из:', keyValuePairs + '\nОтвет сервера:\n' + data.toString());
      }
    }
    //console.log('lines:', lines);
    for (let i = lines.length - 1; i > 1; i--) {

      //console.log("line="+lines[i]);
      const line = lines[i].trim();
      //console.log('line:', line);
      if (line) {
        //  Разбиваем строку по пробелам, игнорируя пробелы в кавычках
        let parts = [];
        let current = '';
        let inQuotes = false; // Флаг, отслеживающий нахождение в кавычках
        for (let j = 0; j < line.length; j++) {
          const char = line[j];

          if (char === '"') {
            inQuotes = !inQuotes;
            if (!inQuotes) {
              parts.push(current);
              current = '';
            } else {
              current += char;
            }
          } else if (!inQuotes && char === ' ') {
            parts.push(current);
            current = '';
          } else {
            current += char;
          }
        }
        if (current) {
          parts.push(current);
        }

        //  parts = result;  //  Замените parts на result
        let name = parts[2] ? parts[2].startsWith('"') && parts[2].endsWith('"') ? parts[2].slice(1, -1) : parts[2] : null;
        name = name.replace(/"/g, ''); // Удаляет все символы "
        const player = {
          score: parseInt(parts[0]),
          ping: parseInt(parts[1]),
          name: name
        };
        players.push(player);
      }
    }
    //console.log("server info:");
    //console.log(serverInfo);
    //console.log('players info:')
    //console.log(players);
    //console.log(players);
  } catch (error) { console.log('Ошибка:', error); }
  return { serverInfo, players };
}

//----------------------------------------------------------------------------------------

function parseQuake2Response4(data, serverIp, serverPort) {
  //console.log(data.toString());
  const lines = data.toString().split('\n');
  const serverInfo = {};
  const players = [];
  const line = lines[1] ? lines[1].trim() : '';
  const keyValuePairs = line.substring(6).split('\\');
  //console.log('keyValuePairs.length='+keyValuePairs.length.toString());

  serverInfo['serverIp'] = serverIp;
  serverInfo['serverPort'] = serverPort;
  for (let j = 0; j < keyValuePairs.length; j += 2) {
    if (keyValuePairs[j + 1]) {
      const key = keyValuePairs[j].trim();
      const value = keyValuePairs[j + 1].trim();
      serverInfo[key] = value;
    } else {
      console.log('Не удалось извлечь пару ключ-значение из:', keyValuePairs + '\nОтвет сервера:\n' + data.toString());
    }
  }
  console.log('lines:', lines);
  for (let i = lines.length - 1; i > 1; i--) {

    //console.log("line="+lines[i]);
    const line = lines[i].trim();
    console.log('line:', line);
    if (line) {
      //  Разбиваем строку по пробелам, игнорируя пробелы в кавычках
      let parts = line.split(' ');
      let result = [];
      let current = '';
      let inQuotes = false; // Флаг, отслеживающий нахождение в кавычках
      for (let j = 0; j < parts.length; j++) {
        if (parts[j].startsWith('"') && parts[j].endsWith('"')) {
          result.push(parts[j]);
        } else if (parts[j].startsWith('"')) {
          // Добавлен пробел, если это первый элемент в кавычках
          current += parts[j] + (j > 0 ? ' ' : '');
          inQuotes = true;
        } else if (parts[j].endsWith('"')) {
          current += parts[j];
          result.push(current);
          current = '';
          inQuotes = false;
        } else if (inQuotes) { // Если мы внутри кавычек, добавляем пробел
          current += parts[j] + ' ';
        } else {
          result.push(parts[j]);
        }
      }
      //  parts = result;  //  Замените parts на result
      const player = {
        score: parseInt(result[0]),
        ping: parseInt(result[1]),
        name: result[2] ? result[2].slice(1, -1) : null
      };
      players.push(player);
    }
  }
  //console.log("server info:");
  //console.log(serverInfo);
  //console.log('players info:')
  //console.log(players);
  //console.log(players);
  return { serverInfo, players };
}



function parseQuake2Response3(data, serverIp, serverPort) {
  console.log(data.toString());
  const lines = data.toString().split('\n');
  const serverInfo = {};
  const players = [];

  const line = lines[1] ? lines[1].trim() : '';
  const keyValuePairs = line.substring(6).split('\\');
  //console.log('keyValuePairs.length='+keyValuePairs.length.toString());

  serverInfo['serverIp'] = serverIp;
  serverInfo['serverPort'] = serverPort;
  for (let j = 0; j < keyValuePairs.length; j += 2) {
    if (keyValuePairs[j + 1]) {
      const key = keyValuePairs[j].trim();
      const value = keyValuePairs[j + 1].trim();
      serverInfo[key] = value;
    } else {
      console.warn('Не удалось извлечь пару ключ-значение из:', keyValuePairs + '\nОтвет сервера:\n' + data.toString());
    }
  }

  for (let i = lines.length - 1; i > 1; i--) {
    console.log("line=" + lines[i]);
    const line = lines[i].trim();
    if (line) {
      //  Разбиваем строку по пробелам, игнорируя пробелы в кавычках
      let parts = line.split(' ');
      let result = [];
      let current = '';
      for (let j = 0; j < parts.length; j++) {
        if (parts[j].startsWith('"') && parts[j].endsWith('"')) {
          result.push(parts[j]);
        } else if (parts[j].startsWith('"')) {
          current += parts[j].slice(1);
        } else if (parts[j].endsWith('"')) {
          current += parts[j].slice(0, -1);
          result.push(current);
          current = '';
        } else {
          result.push(parts[j]);
        }
      }
      //  parts = result;  //  Замените parts на result
      const player = {
        score: parseInt(result[0]),
        ping: parseInt(result[1]),
        name: result[2] ? result[2].slice(1, -1) : null
      };
      players.push(player);
    }
  }

  return { serverInfo, players };
}

function parseQuake2ResponseOld(data, serverIp, serverPort) {
  console.log(data.toString());
  const lines = data.toString().split('\n');
  const serverInfo = {};
  const players = [];

  const line = lines[1] ? lines[1].trim() : '';
  const keyValuePairs = line.substring(6).split('\\');
  //console.log('keyValuePairs.length='+keyValuePairs.length.toString());

  serverInfo['serverIp'] = serverIp;
  serverInfo['serverPort'] = serverPort;
  for (let j = 0; j < keyValuePairs.length; j += 2) {
    if (keyValuePairs[j + 1]) {
      const key = keyValuePairs[j].trim();
      const value = keyValuePairs[j + 1].trim();
      serverInfo[key] = value;
    } else {
      console.warn('Не удалось извлечь пару ключ-значение из:', keyValuePairs + '\nОтвет сервера:\n' + data.toString());
    }
  }

  for (let i = lines.length - 1; i > 1; i--) {
    console.log("line=" + lines[i]);
    const line = lines[i].trim();
    if (line) {
      const parts = line.split(' ');
      const player = {
        score: parseInt(parts[0]),
        ping: parseInt(parts[1]),
        name: parts[2] ? parts[2].slice(1, -1) : null // Убираем кавычки только если parts[2] не undefined
      };
      players.push(player);
    }
  }

  return { serverInfo, players };
}

module.exports = { getServerListQ2: getServerList, queryServerQ2: queryServer, startUpdateServersListQ2: startUpdateServersList};