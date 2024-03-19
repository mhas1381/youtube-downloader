const express = require('express');
const port = 3948;

const app = express();

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

const TelegramBot = require("node-telegram-bot-api");
const ytdl = require("ytdl-core");
const fs = require("fs");

require("dotenv").config();

// Replace YOUR_BOT_TOKEN with your actual bot token
const token = process.env.B;

// Create a bot instance
const bot = new TelegramBot(token, { polling: true });

// Function to download a YouTube video and send it as a video file
async function downloadVideo(chatId, url) {
  try {
    // Get video information and thumbnail URL
    const videoInfo = await ytdl.getInfo(url);
    const title = videoInfo.player_response.videoDetails.title;
    const thumbnailUrl =
      videoInfo.videoDetails.thumbnails[
        videoInfo.videoDetails.thumbnails.length - 1
      ].url;
    // Send a message to show the download progress
    const message = await bot.sendMessage(
      chatId,
      `*Downloading video:* ${title}`
    );

    // Create a writable stream to store the video file
    const writeStream = fs.createWriteStream(`${title}-${chatId}.mp4`);

    // Start the download and pipe the video data to the writable stream
    ytdl(url, { filter: "audioandvideo" }).pipe(writeStream);

    // Set up an interval to update the message with the download progress every 5 seconds
    let progress = 0;
    const updateInterval = setInterval(() => {
      progress = writeStream.bytesWritten / (1024 * 1024);
      bot.editMessageText(
        `*ویدیو در حال دانلود:* ${title} (${progress.toFixed(2)} MB) \u{1F4E6}`,
        {
          chat_id: chatId,
          message_id: message.message_id,
          parse_mode: "Markdown", // use Markdown formatting
        }
      );
    }, 2000);

    // When the download is complete, send the video and delete the file
    writeStream.on("finish", () => {
      clearInterval(updateInterval); // stop updating the message
      bot
        .sendVideo(chatId, `${title}-${chatId}.mp4`, {
          caption: `*دانلود به اتمام رسید:* ${title} "دانلود شده توسط" @proshtech `,
          thumb: thumbnailUrl,
          duration: videoInfo.videoDetails.lengthSeconds,
          parse_mode: "Markdown",
        })

        .then(() => {
          fs.unlinkSync(`${title}-${chatId}.mp4`); // delete the file
        })
        .catch((error) => {
          bot.sendMessage(chatId, "ارسال ویدیو با مشکل روبرو شده");
          console.error(error);
        });
    });
  } catch (error) {
    bot.sendMessage(chatId, "دانلود ویدیو با مشکل روبرو شده.");
    console.error(error);
  }
}

// Listen for the /sdown command
bot.onText(/\/sdown/, (msg) => {
  const chatId = msg.chat.id;
  const url = msg.text.split(" ")[1];

  if (ytdl.validateURL(url)) {
    downloadVideo(chatId, url);
  } else {
    bot.sendMessage(chatId, "آدرس ویدیو نامعتبر است");
  }
});

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  // Send a message with the introduction and instructions
  bot.sendMessage(
    chatId,
    ` میتونی لینک ویدیو یوتوبت رو برام اینجا بفرستی و من ویدیو رو برات همینجا ارسال میکنم. از دستور زیر برای ارسال ویدیو استفاده کن

/sdown - لینک ویدیو یوتوب`
  );
});
