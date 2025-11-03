//const { Telegraf } = require('telegraf');
const Table = require('cli-table3');
const { getUserSettings, updateUserSettings, getUserSettingsString, getAllUsers, getBannedUsers, banUser, unbanUser, addAdmin, removeAdmin, getAdmins, deleteUser, deleteAllUsers, banCheck } = require('./db'); // Предполагаем, что эти функции реализованы в db.js
const { getServerListQ2, queryServerQ2, startUpdateServersListQ2} = require('./quake2');
const { getServerListQW, queryServerQW, startUpdateServersListQW} = require('./qw');
const config = require('./config');

const ownerId = config.OWNER_ID; // ID владельца бота
const userTimers = {};
const userContexts = {}; // Сохраняем контексты пользователей
const messageIds = {}; // Объект для хранения ID сообщений по игровым серверам
const heuristicHistoryScores = {}; // Массив для эвристики
const heuristicHistoryMaps = {}; // Массив для эвристики
const heuristicHistoryPlayers = {}; // Массив для эвристики
const heuristicHistoryPlayersScores = {}; // Массив для эвристики

/* --------------------------------------------------------------------------------------------------------------------------------------------------------*/
startUpdateServersListQ2();
startUpdateServersListQW();
initializeAutoServersUpdate();

/* --------------------------------------------------------------------------------------------------------------------------------------------------------*/
function canDetailsLog() {
  try {
    if (config.PROD == 1) {
      return true;
    }
    else return false;
  } catch (error) {
    console.log(`Ошибка: ${error.message}`);
    return true;
  };
}

/* --------------------------------------------------------------------------------------------------------------------------------------------------------*/

// Функция для автообновления информации с серверов
async function initializeAutoServersUpdate() {
  try {
    const updateServersEnabled = true;
    const timerUpdate = config.SERVERS_UPDATE_TIMER;// 30;
    console.log('Старт автообновления серверов');
    if (updateServersEnabled) {
      await startAutoServersUpdate(timerUpdate); // Запускаем автообновление для пользователей с установленным таймером
    }

  } catch (error) {
    console.log(`Ошибка при инициализации автопоиска: `, error);
  }
}

/* --------------------------------------------------------------------------------------------------------------------------------------------------------*/

// Функция для апдейта
async function startAutoServersUpdate(interval) {
  try {

    if (typeof interval === 'undefined') {
      interval = 30; // Установите значение по умолчанию, если таймер не указан
    }

    setInterval(async () => {

      const games = config.GAMES.split(',');
      let allServers = {
        q2: [],
        qw: []
      };
      //const botSettings = await getUserSettings(0);

      for (curGameIdx = 0; curGameIdx < games.length; curGameIdx++) {
        let serverList;
        let serverPlayers;
        let serverInfo;

        if (games[curGameIdx] == 'q2') {
          console.log('Старт автообновления серверов ', games[curGameIdx]);
          serverList = await getServerListQ2();
          const promises = serverList.map(async (server) => {
            const [ip, port] = server.split(':');
            ({ players: serverPlayers, serverInfo } = await queryServerQ2(ip, port));
            serverInfo.serverPlayers = serverPlayers;
            allServers.q2.push(serverInfo);
          });
          // Ждем, пока все промисы завершатся
          await Promise.allSettled(promises);
          console.log('allServers.length=', allServers.q2.length);
        }
        else if (games[curGameIdx] == 'qw') {
          console.log('Старт автообновления серверов ', games[curGameIdx]);
          serverList = await getServerListQW();
          const promises = serverList.map(async (server) => {
            const [ip, port] = server.split(':');
            ({ players: serverPlayers, serverInfo } = await queryServerQW(ip, port));
            serverInfo.serverPlayers = serverPlayers;
            allServers.qw.push(serverInfo);
          });
          // Ждем, пока все промисы завершатся
          await Promise.allSettled(promises);
          console.log('allServers.length=', allServers.qw.length);
        }

      }
      await updateUserSettings(0, { allservers: allServers });
      console.log('Данные по серверам и игрокам обновлены в БД');

    }, interval * 1000);
  } catch (error) { console.log(`Ошибка: ${error.message}`) };
}

/* --------------------------------------------------------------------------------------------------------------------------------------------------------*/

async function getServerList(game) {
  try {
    if (canDetailsLog()) console.log('getServerList - game:', game);
    const botSettings = await getUserSettings(0);
    if (botSettings && botSettings.allservers && botSettings.allservers[game]) {
      return botSettings.allservers[game].map(server => `${server.serverIp}:${server.serverPort}`);
    } else {
      return [];
    }
  } catch (error) {
    if (canDetailsLog()) console.log('getServerList:', error);
    return [];
  }
}

/* --------------------------------------------------------------------------------------------------------------------------------------------------------*/

async function getServerListFromCache(game) { //для получения серверов из кэша напрямую
  let servers = [];
  try {
    if (canDetailsLog()) console.log('getServerListFromCache - game:', game);
    if (game == 'q2') servers = await getServerListQ2();
    else if (game == 'qw') servers = await getServerListQW();
  } catch (error) {
    console.log('getServerListFromCache:', error);
    return [];
  }
  return servers;
}

/* --------------------------------------------------------------------------------------------------------------------------------------------------------*/

async function queryServer(game, ip, port) {
  let serverPlayers;
  let serverInfo;
  try {
    //if (canDetailsLog()) console.log('queryServer - game:', game);
    const botSettings = await getUserSettings(0);
    if (botSettings && botSettings.allservers && botSettings.allservers[game]) {
      const server = botSettings.allservers[game].find(server => {
        return server.serverIp === ip && server.serverPort === port;
      });
      if (server) {
        serverPlayers = server.serverPlayers;
        serverInfo = { ...server }; // Создаем копию, чтобы не изменять исходный объект
        delete serverInfo.serverPlayers; // Удаляем serverPlayers из serverInfo
        return { serverPlayers, serverInfo };
      } else {
        return { serverPlayers: [], serverInfo: {} }; // Возвращаем пустые объекты, если сервер не найден
      }
    } else {
      return { serverPlayers: [], serverInfo: {} }; // Возвращаем пустые объекты, если серверов нет
    }
  } catch (error) {
    if (canDetailsLog()) console.log('getServerList:', error);
    return { serverPlayers: [], serverInfo: {} }; // Возвращаем пустые объекты, если серверов нет
  }
}

/* --------------------------------------------------------------------------------------------------------------------------------------------------------*/

async function queryServerDirect(game, ip, port) {
  let serverPlayers = [];
  let serverInfo = {};
  try {
    if (game == 'q2') {
      ({ players: serverPlayers, serverInfo } = await queryServerQ2(ip, port));
    } else if (game == 'qw') {
      ({ players: serverPlayers, serverInfo } = await queryServerQW(ip, port));
    }
    return { serverPlayers, serverInfo };

  } catch (error) {
    if (canDetailsLog()) console.log('getServerList:', error);
    return { serverPlayers: [], serverInfo: {} }; // Возвращаем пустые объекты, если серверов нет
  }
}

/* --------------------------------------------------------------------------------------------------------------------------------------------------------*/
