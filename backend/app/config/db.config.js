require("dotenv").config();
module.exports = {
  url: process.env.MONGODB_URI,
  geminiApiKey: process.env.GEMINI_API_KEY
};
