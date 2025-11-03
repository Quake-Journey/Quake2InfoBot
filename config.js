module.exports = {
  MONGODB_URI: 'mongodb://localhost:27017/quake2info', // Замените на ваш URI MongoDB
  TELEGRAM_TOKEN: '',// токен вашего бота
  OWNER_ID: , // Telegram ID владелеца бота
  PROD: 1, // 1 - запущено в проде	
  SERVERS_UPDATE_TIMER: 30,
  MIN_TIMER: 10, // 30 секунд
  MAX_TIMER: 21600000, // 6 часов
  MAX_MESSAGES_PER_SECOND: 10,
  MAX_MESSAGES_PER_SEARCH: 51,
  SLEEP_TIME: 10000, // 10 секунд между уведомлениями в случае превышения разрешенного кол-ва
  VERSION: '0.9.9',
  GAMES_SUPPORT:  'Quake II , QuakeWorld',
  GAMES: 'q2,qw',
  DEFAULT_GAME: 'q2',
  GAMES_TITLES: {'q2': 'Quake II', 'qw': 'QuakeWorld'},
  PLAYERS_COUNT_LIMIT: 50,
  PLAYERS_NICK_NAME_LIMIT: 1,
  PLAYERS_NICK_NAME_MASK_LIMIT: 2,
  FIND_TEXT_LIMIT: 3,
  SERVERS_COUNT_LIMIT: 20,
  MAPS_COUNT_LIMIT: 20,
  MAPS_NAME_LIMIT: 1,
  MAPS_NAME_MASK_LIMIT: 2,
  BOT_NAME: "QuakeInfoBot",
  BOT_ID: 666,
  SERVER_MIN_PLAYERS: 8, 
};