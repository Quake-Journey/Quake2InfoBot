const { MongoClient } = require('mongodb');
const config = require('./config');

let dbInstance;

async function connectDB() {
  if (!dbInstance) {
    const client = new MongoClient(config.MONGODB_URI);
    await client.connect();
    dbInstance = client.db();
  }
  return dbInstance;
}

async function getUserSettings(userId) {
  const db = await connectDB();
  userId = parseInt(userId);
  return db.collection('users').findOne({ userId });
}

async function updateUserSettings(userId, settings) {
  const db = await connectDB();
  userId = parseInt(userId);
  return db.collection('users').updateOne({ userId }, { $set: settings }, { upsert: true });
}


async function getUserSettingsString(userId) {
  const db = await connectDB();
  userId = parseInt(userId);
  const user = await db.collection('users').findOne({ userId });

  if (!user) {
    return null;
  }

  let settingsString = '';
  for (const key in user) {
    if (user.hasOwnProperty(key)) {
      const value = user[key];
      if (Array.isArray(value)) {
        settingsString += `${ key }: [${ value.join(', ') }]\n`;
      } else {
        settingsString += `${ key }: ${ value } \n`;
      }
    }
  }
  return settingsString;
}

/*

async function getBotSettings(type) {
  const db = await connectDB();
  //let botName = config.BOT_ID;
  return db.collection(type).findOne(type);
}

async function updateBotSettings(type,settings) {
  const db = await connectDB();
  //let botName = config.BOT_NAME;
  return db.collection(type).updateOne(type, { $set: settings }, { upsert: true });
}

*/

async function deleteUser(userId) {
  const db = await connectDB();
  const collection = db.collection('users');
  userId = parseInt(userId);
  return collection.deleteMany({ userId });
}

async function deleteAllUsers() {
  const db = await connectDB();
  const collection = db.collection('users');
  return collection.deleteMany();
}

// Новая функция для получения всех пользователей
async function getAllUsers() {
  const db = await connectDB();
  return db.collection('users').find({}).toArray(); // Возвращаем массив всех пользователей
}

// Функция для получения заблокированных пользователей
async function getBannedUsers() {
  const db = await connectDB();
  return db.collection('users').find({ banned: true }).toArray(); // Возвращаем массив заблокированных пользователей
}

// Функция для блокировки пользователя
async function banUser(userId) {
  const db = await connectDB();
  userId = parseInt(userId);
  return db.collection('users').updateOne({ userId }, { $set: { banned: true } }, { upsert: true });
}

// Функция для разблокировки пользователя
async function unbanUser(userId) {
  const db = await connectDB();
  userId = parseInt(userId);
  return db.collection('users').updateOne({ userId }, { $set: { banned: false } });
}

// Функция для проверки бана пользователя
async function banCheck(userId) {
  const db = await connectDB();
  userId = parseInt(userId);
  var banned = db.collection('users').findOne({ userId }).banned || false; //по умолчанию не забанен
  if (banned !== true) banned = false;
  return banned;
}


// Функция для добавления администратора
async function addAdmin(userId) {
  const db = await connectDB();
  userId = parseInt(userId);
  return db.collection('users').updateOne({ userId }, { $set: { isAdmin: true } }, { upsert: true });
}

// Функция для удаления администратора
async function removeAdmin(userId) {
  const db = await connectDB();
  userId = parseInt(userId);
  return db.collection('users').updateOne({ userId }, { $set: { isAdmin: false } });
}

// Функция для получения списка администраторов
async function getAdmins() {
  const db = await connectDB();
  const admins = await db.collection('users').find({ isAdmin: true }).toArray();
  return admins.map(admin => admin.userId); // Возвращаем массив ID администраторов
}

// Функция для удаления всех администраторов
async function removeAllAdmins() {
  const db = await connectDB();
  return db.collection('users').updateMany({}, { $set: { isAdmin: false } });
}

module.exports = {
  getUserSettings,
  updateUserSettings,
  getUserSettingsString,
  getAllUsers,
  getBannedUsers,
  banUser,
  unbanUser,
  addAdmin,
  removeAdmin,
  getAdmins,
  removeAllAdmins,
  deleteUser,
  deleteAllUsers,
  banCheck
  //getBotSettings,
  //updateBotSettings
};