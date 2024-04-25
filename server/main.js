require('dotenv').config();
const fs = require('fs');

const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const sendToken = require('./token');

const app = express();

const { 
  expressApp, 
  lastCmd, 
  userStates, 
  setLastCmd, 
  corsOptions 
} = require('./server');

const { generateMultipleCodes, saveCodesToJsonFile, searchForCode, removeCodeFromList, populateAuthData } = require('../utils.js');
const { parseEther } = require('ethers');
let userAuthData ;

let depositAddresses, usernames = [];

try {
    (async () => {
    userAuthData = await populateAuthData();

    const data = fs.readFileSync('data/appData.json', 'utf8');
    depositAddresses = JSON.parse(data);
    // Extract the usernames by splitting the keys
    usernames = Object.keys(depositAddresses).map(key => key.split(':')[0]);
    })()
  } catch (err) {
    console.error("Error reading or parsing the file", err);
    depositAddresses = {}; // fallback to empty object
}
 

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

bot.onText(/\/help(?: (.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const username =  msg.from.username;

  let helpMessage = `
      Welcome to the Perezoso Telegram Bot help!

      Available commands: `;

  if (username && checkAuth(username)) {
      // User is authenticated, show admin functions
      helpMessage += `
      /genCodes [number] [codeLength] [communityName] [yourUsername] [influencerAddress] - Generate codes
      /authenticate [yourUsername] [token] - Authenticate user
      /status [yourUsername] - Check user status`;
  } else {
      // User is not authenticated, show basic commands
      helpMessage += `
      /claim [code] [communityName] [recipientAddress] - Claim rewards`;
  }

  helpMessage += `
      /help - Show this help message

      Enjoy using the bot!`;

  bot.sendMessage(chatId, helpMessage);
});

bot.onText(/\/genCodes (.+) (.+) (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const nCodes = parseInt(match[1]); 
  const communityName = match[2];
  const influencerAddress = match[3];
  const user = msg.from.username;

  // Validation for maximum number of codes
  if (nCodes > 200) {
    bot.sendMessage(chatId, 'You can only generate up to 200 codes at a time.');
    return;
  }

  // Basic input validation
  if (isNaN(nCodes) || communityName === '' || influencerAddress === '') {
    bot.sendMessage(chatId, 'Invalid input. Please provide valid data.');
    return;
  }

  // Authentication check
  let authenticated = false;
  try {
    authenticated = checkAuth(user);
    if (!authenticated) {
      bot.sendMessage(chatId, `User ${user} is not authenticated.`);
      return;
    } 
  } catch (err) {
    bot.sendMessage(chatId, err.toString());
    console.error("Error with authentication check", err);
    return;
  }

  // Updating the user's last active state
  updateIdleState(user);

  // Generate codes
  const codes = generateMultipleCodes(nCodes, 24); // Assuming code length is fixed at 24 as per your example
  console.log(`Generated codes: ${codes}`);

  // Save codes to JSON file
  try {
    saveCodesToJsonFile(codes, communityName, influencerAddress);
  } catch (err) {
    bot.sendMessage(chatId, err.toString());
    console.error("Error saving codes to JSON file", err);
  }

  // Format and send back the codes in a numbered list
  const formattedCodes = codes.map((code, index) => `${index + 1}. ${code}`).join('\n');
  bot.sendMessage(chatId, `Generated Codes:\n${formattedCodes}`);
});


bot.onText(/\/claim (.+) (.+) (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const code = match[1]; 
  const communityName = match[2];
  const recipientAddress = match[3];
  const amount = '50000';

  console.log(`Attempting to transfer amount ${amount}`);
  try {
      const { found, foundIndex, influencerAddress } = await searchForCode(code, communityName);

      let tx
      if (!found) {
          bot.sendMessage(chatId, `Invalid code: ${code}`);
      } else {
          // Remove code from the list
          await removeCodeFromList(communityName, foundIndex, influencerAddress);
          
          tx = await sendToken(recipientAddress, amount);
          console.log(tx);
          console.log(`Token sent successfully with tx hash: ${tx.hash}`);
          bot.sendMessage(chatId, `Token sent successfully with tx hash: ${tx.hash}`);

          tx = await sendToken(influencerAddress, amount);
          console.log(tx);
          console.log(`Token sent successfully with tx hash: ${tx.hash}`);
      }
  } catch (error) {
      console.error("Error:", error);
      bot.sendMessage(chatId, "An error occurred while processing your request.");
  }
});

bot.onText(/\/authenticate/, (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username;
  console.log(depositAddresses)
  // Check if the username exists in depositAddresses
  if (depositAddresses[username]) {
      // User is considered authenticated
      userAuthData[username] = { authenticated: true, lastCommandTime: Date.now(), idle: false };
      bot.sendMessage(chatId, `User ${username} authenticated successfully.`);
  } else {
      bot.sendMessage(chatId, `Authentication failed. No data found for this ${username}.`);
  }
});


bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username; // Correctly accessing the username
  
  if (userAuthData[username]) {
      const userData = userAuthData[username];
      const status = {
          username: username,
          authenticated: userData.authenticated || false,
          lastCmdOn: userData.lastCommandTime ? new Date(userData.lastCommandTime).toISOString() : 'N/A',
          idle: userData.idle
      };

      bot.sendMessage(chatId, `Status: ${JSON.stringify(status, null, 2)}`);
  } else {
      bot.sendMessage(chatId, `No data found for username: ${username}`);
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
