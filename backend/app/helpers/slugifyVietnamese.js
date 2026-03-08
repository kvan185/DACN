module.exports = function slugifyVietnamese(text = "") {
  if (!text || typeof text !== "string") return "";

  const result = text
    .toLowerCase()
    .normalize("NFD")                     // tách dấu
    .replace(/[\u0300-\u036f]/g, "")     // bỏ dấu
    .replace(/đ/g, "d")                  // đ → d
    .replace(/[^a-z0-9]+/g, "_")         // ký tự lạ → _
    .replace(/_+/g, "_")                 // gộp nhiều _
    .replace(/^_+|_+$/g, "");            // bỏ _ đầu/cuối

  // console.log("[slugifyVietnamese] Result:", result);
  return result;
};
