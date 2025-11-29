module.exports = {
  MONGODB_URI: 'mongodb://localhost:27017/quake2info', // Замените на ваш URI MongoDB
  TELEGRAM_TOKEN: '', // Замените на токен вашего бота
  OWNER_ID: , // Владелец бота
  PROD: 0, // 1 - запущено в проде	
  SERVERS_UPDATE_TIMER: 15,
  MIN_TIMER: 2, // 2 секунды
  MAX_TIMER: 21600000, // 6 часов
  GLOBAL_REFRESH_INTERVAL: 10,   // 🔁 глобальный опрос всех серверов, сек
  MAX_MESSAGES_PER_SECOND: 10,
  MAX_MESSAGES_PER_SEARCH: 51,
  SLEEP_TIME: 10000, // 10 секунд между уведомлениями в случае превышения разрешенного кол-ва
  VERSION: '1.0.0',
  GAMES_SUPPORT:  'Quake II , QuakeWorld',
  GAMES: 'q2,qw',
  DEFAULT_GAME: 'q2',
  GAMES_TITLES: {'q2': 'Quake II', 'qw': 'QuakeWorld'},
  PLAYERS_COUNT_LIMIT: 50,
  PLAYERS_NICK_NAME_LIMIT: 1,
  PLAYERS_NICK_NAME_MASK_LIMIT: 2,
  SERVERS_COUNT_LIMIT: 20,
  FIND_TEXT_LIMIT: 3,
  MAPS_COUNT_LIMIT: 20,
  MAPS_NAME_LIMIT: 1,
  MAPS_NAME_MASK_LIMIT: 2,
  BOT_NAME: "QuakeInfoBot",
  BOT_ID: 666,
  SERVER_MIN_PLAYERS: 8, 
};