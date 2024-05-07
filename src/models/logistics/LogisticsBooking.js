import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  logisticsCompany: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Logistics', // Reference to the Logistics model
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  userType: {
    type: String,
    enum: ['user', 'farmer', 'store', 'logistics', 'company'],
    required: true,
  },
  logistics: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LogisticsVehicle'
  },
  pickupLocation: {
    type: String,
    required: true,
  },
  deliveryLocation: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
  },
  name: {
    type: String,
  },
  deliveryType: {
    type: String,
    enum: ['withinCity', 'interstate'],
    required: true,
  },
  status: {
    type: String,
    enum: ['paid', 'processing', 'cancelled', 'collected', 'in-route', 'booking', 'delivered'],
    default: 'booking',
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  negotiatedPrice: {
    type: Number,
  },
}, { timestamps: true });

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
