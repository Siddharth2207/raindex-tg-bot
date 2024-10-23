const { default: serverless } = require('serverless-http');
const express = require('express');
const bodyParser = require('body-parser');
const bot = require('../index');  // This imports your bot instance

const app = express();
app.use(bodyParser.json());  // Middleware to parse incoming JSON

app.post('/api/bot', (req, res) => {
  bot.processUpdate(req.body);  // This will forward the update to the bot
  res.sendStatus(200);  // Respond OK to Telegram
});

module.exports = app;
module.exports.handler = serverless(app);
