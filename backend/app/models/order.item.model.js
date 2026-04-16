module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        order_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
        },
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
        },
        product_name: {
          type: String,
        },
        product_image: {
          type: String,
        },
        qty: {
            type: Number,
        },
        price: {
            type: Number,
        },
        total_price: {
          type: Number,
        },
        is_active: {
            type: Boolean,
            default: true,
        },
        batch_num: {
            type: Number,
            default: 1,
        },
        status: {
            type: String,
            enum: ['NEW', 'PREPARING', 'SERVED', 'CANCELED'],
            default: 'NEW'
        },
        served_at: {
            type: Date
        }
      },
      { timestamps: true }
    );
  
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    const OrderItem = mongoose.models.order_item || mongoose.model("order_item", schema);

    return OrderItem;
  };
  