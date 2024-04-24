// expressApp.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');

let depositAddresses;
let usernames = [];
let lastCmd, lastCmdParameters = null;
let userAuthData = {};

const userStates = {}; 

try {
    const data = fs.readFileSync('data/appData.json', 'utf8');
    depositAddresses = JSON.parse(data);
    // Extract the usernames by splitting the keys
    usernames = Object.keys(depositAddresses).map(key => key.split(':')[0]);
} catch (err) {
    console.error("Error reading or parsing the file", err);
    depositAddresses = {}; // fallback to empty object
}
 
const expressApp = express();

const allowedOrigins = ['https://just-dice.com', 'https://primedice.com'];

// Configure CORS
const corsOptions = {
  origin: '*', // This allows all origins. In production, you might want to restrict this to specific domains
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Configure CORS
expressApp.use(cors());

expressApp.get('/api/getState', (req, res) => {

    // Access the query parameters from req.query
   const { username, running, balance, wagered, profit, last_lucky_num, current_bet_num, session_bet_count } = req.query;
 
   // Create or update the state for the user
   userStates[username] = {
     username,
     running,
     balance,
     wagered,
     profit,
     last_lucky_num,
     current_bet_num,
     session_bet_count
   };
 
   // Send a response
   res.json({ message: 'Data received successfully' });
 });
 
  
 expressApp.get('/api/getCmd', (req, res) => {
    // Send a response
    res.json({ message: lastCmd });
});

setInterval(() => {
  if (lastCmd != null) {
      lastCmd = null;
  }
}, 5000);

function setLastCmd(cmd, parameters) {
    lastCmd = cmd;
    lastCmdParameters = parameters;
}

module.exports = {
    corsOptions,
    expressApp,
    lastCmd,
    userAuthData,
    userStates,
    usernames,
    depositAddresses,
    setLastCmd,
};