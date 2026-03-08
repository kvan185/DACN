const fs = require('fs');
const path = require('path');

module.exports = function findCategoryFolder(categoryId) {
  // console.log("[findCategoryFolder] Input categoryId:", categoryId);

  if (!categoryId) {
    // console.log("categoryId is empty");
    return null;
  }

  const baseDir = path.join(__dirname, '../../static/images');
  // console.log("Base dir:", baseDir);

  if (!fs.existsSync(baseDir)) {
    console.log("Base dir does NOT exist");
    return null;
  }

  const id = String(categoryId).trim();
  // console.log("Normalized categoryId:", id);

  const folders = fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  // console.log("[findCategoryFolder] All folders found:", folders);

  const folder = folders.find(name => {
    const parts = name.split('_');
    const lastPart = parts[parts.length - 1];

    // console.log(
    //   `Check folder: ${name} → lastPart=${lastPart} === ${id}?`,
    //   lastPart === id
    // );

    return lastPart === id;
  });

  if (!folder) {
    // console.log("[findCategoryFolder] No matching folder found for categoryId:", id);
  } else {
    // console.log("[findCategoryFolder] Matched folder:", folder);
  }

  return folder || null;
};
