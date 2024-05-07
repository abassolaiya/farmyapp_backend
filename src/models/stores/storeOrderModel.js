import mongoose from 'mongoose';

const orderSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    userType: {
      type: String,
      enum: ['user', 'farmer', 'store', 'logistics', 'company'],
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'StoreProduct',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          default: 1,
        },
        negotiated: {
          type: Boolean,
          default: false,
        },
        negotiatedPrice: {
          type: Number,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    deliveryOption: {
      type: String,
      enum: ['pickup', 'delivery'],
      default: 'pickup',
    },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
    },
    logistics: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Logistics',
    },
    logisticsVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LogisticsVehicle',
    }, 
    deliveryAddress: {
      type: String,
    },
    pickupLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store.storeLocations',
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'wallet'],
      default: 'card',
    },
    status: {
      type: String,
      enum: ['Paid', 'Packed', 'In transit', 'Delivered', 'Canceled'],
      default: 'paid',
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model('Order', orderSchema);

export default Order;
