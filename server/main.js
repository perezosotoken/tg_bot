require('dotenv').config()

const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();

const { 
  expressApp, 
  lastCmd, 
  userAuthData, 
  userStates, 
  usernames, 
  depositAddresses, 
  setLastCmd, 
  corsOptions 
} = require('./server');

const { generateMultipleCodes, saveCodesToJsonFile, searchForCode } = require('../utils.js');

// Use the Express application from the module
app.use(expressApp);

const PORT = 31337; // Choose a port number

// Start the server
app.listen(PORT, () => {
  console.log(`Express server is running on port ${PORT}`);
});

// replace the value below with the Telegram token you receive from @BotFather
const token = process.env.TG_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

function checkAuth(username) {
  return userAuthData[username].authenticated;
}

function updateIdleState(username) {
  if (userAuthData[username].authenticated) {
    userAuthData[username].lastCommandTime = Date.now();
    userAuthData[username].idle = false;
  }
  return true;
}

// Match lastCmd command and return lastCmd
bot.onText(/\/cmd (.+) (.+) (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const cmd = match[1]; 
  const user = match[2];

  const authenticated = checkAuth(user);
  if (!authenticated) {
    console.log('Not authenticated'); 
    return;
  } 

  updateIdleState(user);

  console.log(`Cmd is ${cmd} and user is ${user}`)

  setLastCmd(cmd);

});

bot.onText(/\/genCodes (.+) (.+) (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const nCodes = match[1]; 
  const codeLength = match[2];
  const communityName = match[3];

  if (isNaN(nCodes) || isNaN(codeLength)) {
    bot.sendMessage(chatId, 'Invalid input. Please provide valid numbers for the number of codes and code length.');
    return;
  }

  // const authenticated = checkAuth(resp);
  // if (!authenticated) {
  //   console.log('Not authenticated'); 
  //   return;
  // } 

  // updateIdleState(resp);

  const codes = generateMultipleCodes(nCodes, codeLength);
  console.log(`Generated codes: ${codes}`);

  try{
    saveCodesToJsonFile(codes, communityName);
  } catch (err) {
    bot.sendMessage(chatId, err.toString());
    console.error("Error reading or parsing the file", err);
   }

  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, codes.join(', '));

});

bot.onText(/\/claim (.+) (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const code = match[1]; 
  const communityName = match[2];

  searchForCode(code, communityName);

  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, code);

});

bot.onText(/\/deposit (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const resp = match[1]; 
  const username = resp;

  const authenticated = checkAuth(username);
  if (!authenticated) {
    console.log('Not authenticated'); 
    return;
  } 

  updateIdleState(username);

  const token = userAuthData[username].token;
  const key = `${username}:${token}`;

  const addresses = depositAddresses[key];
  console.log(addresses)

  if (addresses) {
    console.log(`Deposit address is ${addresses[0]}`)
    // send back the matched "whatever" to the chat
    bot.sendMessage(chatId, addresses[0]);
  } else {
      // Handle the case where the address is not found
      bot.sendMessage(chatId, 'No address found');
  }

});

bot.onText(/\/state (.+)/, (msg, match) => {   
  const chatId = msg.chat.id;
  const resp = match[1]; 

  const authenticated = checkAuth(resp);
  if (!authenticated) {
    console.log('Not authenticated'); 
    return;
  } 

  updateIdleState(resp);


  if (typeof userStates[resp] !== 'undefined') {
    // send back the matched "whatever" to the chat
    bot.sendMessage(chatId, JSON.stringify(userStates[resp]));
  }

});

bot.onText(/\/wagered (.+)/, (msg, match) => {    
  const chatId = msg.chat.id;
  const resp = match[1]; 
 
  const authenticated = checkAuth(resp);
  if (!authenticated) {
    console.log('Not authenticated'); 
    return;
  } 

  updateIdleState(resp);

  const userState = userStates[resp];
  const wageredObj = {
    wagered: userState.wagered,
  }
  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, JSON.stringify(wageredObj));

});

bot.onText(/\/profit (.+)/, (msg, match) => {    
  const chatId = msg.chat.id;
  const resp = match[1]; 
 
  const authenticated = checkAuth(resp);
  if (!authenticated) {
    console.log('Not authenticated'); 
    return;
  } 

  updateIdleState(resp);

  const userState = userStates[resp];
  const profitObj = {
    profit: userState.profit,
  }

  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, JSON.stringify(profitObj));

});

bot.onText(/\/authenticate (\w+) (\w+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const username = match[1];
  const token = match[2];

  let isAuthenticated = false;

  // Create a key in the format used in depositAddresses
  const userKey = `${username}:${token}`;

  // Check if the key exists in depositAddresses
  if (depositAddresses[userKey]) {
      isAuthenticated = true;
      // Update or add the user's auth data with authenticated flag set to true
      userAuthData[username] = { token: token, idle: false, authenticated: true };
      bot.sendMessage(chatId, `User ${username} authenticated successfully.`);
  }

  if (!isAuthenticated) {
      bot.sendMessage(chatId, "Invalid username or token.");
  }
});

bot.onText(/\/status (\w+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const username = match[1];
  
  if (userAuthData[username]) {
      const userData = userAuthData[username];
      const status = {
          username: username,
          authenticated: userData.authenticated || false,
          lastCmdOn: userData.lastCommandTime ? new Date(userData.lastCommandTime).toISOString() : 'N/A'
      };

      bot.sendMessage(chatId, `Status: ${JSON.stringify(status, null, 2)}`);
  } else {
      bot.sendMessage(chatId, `No data found for username: ${username}`);
  }

  if (userAuthData[username]) {
    userAuthData[username].lastCommandTime = Date.now();
    userAuthData[username].idle = false;
  }

});

// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  // send a message to the chat acknowledging receipt of their message
  // bot.sendMessage(chatId, 'Received your message');
});
 

const FIVE_MINUTES = 5 * 60 * 1000; // 5 minutes in milliseconds

setInterval(() => {
    const currentTime = Date.now();
    for (let username in userAuthData) {
        if (userAuthData.hasOwnProperty(username)) {
            const userData = userAuthData[username];
            if (userData.authenticated && currentTime - userData.lastCommandTime > FIVE_MINUTES) {
                // User has been idle for more than 5 minutes
                userData.idle = true;
                // Implement logout functionality as needed
                // For example, you might want to set authenticated to false
                userData.authenticated = false;
            }
        }
    }
}, FIVE_MINUTES); // Check every 5 minutes
