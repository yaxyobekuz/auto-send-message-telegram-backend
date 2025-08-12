// Cron
const cron = require("node-cron");

// Telegram credintials
const apiHash = process.env.API_HASH;
const apiId = Number(process.env.API_ID);

// Models
const User = require("../models/User");
const Group = require("../models/Group");
const Message = require("../models/Message");

// Helpers
const { delay } = require("../utils/helpers");

// Telegram
const { TelegramClient, Api } = require("telegram");
const { StringSession } = require("telegram/sessions");

class MessageScheduler {
  // Store active cron tasks
  constructor() {
    this.scheduledTasks = new Map();
    this.initializeScheduler();
  }

  // Initialize scheduler on app start
  async initializeScheduler() {
    try {
      const messages = await Message.find({});

      for (const message of messages) {
        this.scheduleMessage(message);
      }

      console.log(`Initialized ${messages.length} scheduled messages`);
    } catch (error) {
      console.error("Error initializing scheduler:", error);
    }
  }

  // Schedule a single message
  scheduleMessage(messageData) {
    const { _id, time, userId } = messageData;
    const taskId = _id.toString();

    // Cancel existing task if exists
    if (this.scheduledTasks.has(taskId)) {
      this.scheduledTasks.get(taskId).destroy();
    }

    // Create new cron task
    const task = cron.schedule(
      this.parseTimeToCron(time),
      async () => {
        await this.sendMessageToGroups(messageData);
      },
      {
        scheduled: false,
        timezone: "Asia/Tashkent",
      }
    );

    task.start();
    this.scheduledTasks.set(taskId, task);

    console.log(`Scheduled message ${taskId} for time: ${time}`);
  }

  // Convert time format to cron format
  parseTimeToCron(timeString) {
    // Assuming time format is "HH:MM" (24-hour format)
    const [hours, minutes] = timeString.split(":");
    return `${minutes} ${hours} * * *`; // Daily at specified time
  }

  // Main function to send messages to all user groups
  async sendMessageToGroups(messageData) {
    try {
      const { userId, messages } = messageData;

      // Get user session
      const user = await User.findOne({ _id: userId });
      if (!user || !user.session) {
        return console.error(`User ${userId} not found or no session`);
      }

      // Get user groups
      const userGroups = await Group.find({ userId: userId });
      if (userGroups.length === 0) {
        return console.log(`No groups found for user ${userId}`);
      }

      // Initialize Telegram client
      const client = await this.initializeTelegramClient(user.session);

      const sendWithDelay = async (client, groups, messages, delayMs) => {
        const results = [];
        for (const group of groups) {
          const randomMessage = this.selectRandomMessage(messages);
          try {
            const res = await this.sendToGroup(client, group, randomMessage);
            results.push({ status: "fulfilled", value: res });
          } catch (err) {
            results.push({ status: "rejected", reason: err });
          }
          await delay(delayMs);
        }
        return results;
      };

      const results = await sendWithDelay(client, userGroups, messages, 2000);

      // Log results
      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      console.log(
        `Message sent to ${successful} groups, ${failed} failed for user ${userId}`
      );

      // Disconnect client
      await client.disconnect();
    } catch (error) {
      console.error("Error in sendMessageToGroups:", error);
    }
  }

  // Initialize Telegram client with session
  async initializeTelegramClient(sessionString) {
    const session = new StringSession(sessionString);
    const client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
    });

    await client.connect();
    return client;
  }

  // Select random message from messages array
  selectRandomMessage(messagesArray) {
    if (!messagesArray || messagesArray.length === 0) {
      return "Default message"; // Fallback message
    }

    const randomIndex = Math.floor(Math.random() * messagesArray.length);
    return messagesArray[randomIndex];
  }

  // Send message to specific group
  async sendToGroup(client, group, messageText) {
    try {
      let peer;
      if (group.className === "Channel") {
        peer = new Api.InputPeerChannel({
          channelId: BigInt(group.chatId),
          accessHash: BigInt(group.accessHash),
        });
      } else {
        peer = new Api.InputPeerChat({
          chatId: parseInt(group.chatId, 10),
        });
      }

      await client.sendMessage(peer, { message: messageText });
      return { success: true, chatId: group.chatId };
    } catch (error) {
      console.error(`Failed to send message to ${group.chatId}:`, error);
      throw error;
    }
  }

  // Add new message to scheduler
  async addScheduledMessage(messageData) {
    try {
      this.scheduleMessage(messageData);
      console.log(`Added new scheduled message: ${messageData._id}`);
    } catch (error) {
      console.error("Error adding scheduled message:", error);
    }
  }

  // Update existing scheduled message
  async updateScheduledMessage(messageData) {
    try {
      this.scheduleMessage(messageData); // This will replace existing task
      console.log(`Updated scheduled message: ${messageData._id}`);
    } catch (error) {
      console.error("Error updating scheduled message:", error);
    }
  }

  // Remove scheduled message
  async removeScheduledMessage(messageId) {
    try {
      const taskId = messageId.toString();

      if (this.scheduledTasks.has(taskId)) {
        this.scheduledTasks.get(taskId).destroy();
        this.scheduledTasks.delete(taskId);
        console.log(`Removed scheduled message: ${messageId}`);
      }
    } catch (error) {
      console.error("Error removing scheduled message:", error);
    }
  }

  // Get all active scheduled tasks
  getActiveSchedules() {
    return Array.from(this.scheduledTasks.keys());
  }
}

// Export for use in other files
module.exports = MessageScheduler;
