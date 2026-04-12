module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        cart_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Cart',
        },
        customer_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
        },
        first_name: {
            type: String,
        },
        last_name: {
            type: String,
        },
        phone: {
            type: String,
        },
        email: {
            type: String,
        },
        total_item: {
            type: Number,
        },
        total_price: {
            type: Number,
        },
        status: {
            type: String,
        },
        type_order: {
            type: String,
        },
        table_number: {
            type: String,
        },
        is_payment: {
            type: Boolean,
        },
        city_code: {
            type: String,
        },
        district_code: {
            type: String,
        },
        ward_code: {
            type: String,
        },
        is_active: {
            type: Boolean,
            default: true,
        },
        order_source: {
            type: String,
            required: true,
            enum: ['online', 'table'],
            default: 'online',
        },
        payos_order_code: {
            type: Number,
        },
        payment_method: {
            type: String,
            default: '',
        },
        split_bills: {
            type: [{
                split_id: String,
                payos_order_code: Number,
                split_type: String,
                user_name: String,
                items: [{
                    product_id: mongoose.Schema.Types.ObjectId,
                    product_name: String,
                    qty: Number,
                    price: Number
                }],
                percent: Number,
                amount: Number,
                is_payment: { type: Boolean, default: false },
                payment_method: String,
                paid_at: Date
            }],
            default: []
        }
      },
      { timestamps: true }
    );
  
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    const Order = mongoose.model("order", schema);
    return Order;
  };
  