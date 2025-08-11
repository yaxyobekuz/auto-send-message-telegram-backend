const cors = require("cors");
const express = require("express");
const MessageScheduler = require("../services/autoSender");

const messageScheduler = new MessageScheduler();

const app = express();
app.use(cors());

module.exports = { app, express, messageScheduler };
