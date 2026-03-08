const { v4: uuidv4 } = require("uuid");
const path = require("path");
const generateSlug = require("./generateSlug");

function generateImageName(originalName, fallback = "image") {
  const ext = path.extname(originalName);
  const baseName = originalName
    ? generateSlug(path.basename(originalName, ext))
    : fallback;

  return `${uuidv4()}-${baseName}${ext}`;
}

module.exports = generateImageName;
