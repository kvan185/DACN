const mongoose = require("mongoose");

const ingredientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      required: true, // gram | ml | ...
    },
    note: {
      type: String,
      default: "",
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    qty: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ingredient", ingredientSchema);