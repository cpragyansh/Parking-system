import mongoose from 'mongoose';

const parkingLotSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        address: {
            type: String,
            required: true,
        },
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        totalSlots: {
            car: { type: Number, default: 0 },
            bike: { type: Number, default: 0 },
            truck: { type: Number, default: 0 }
        },
        active: {
            type: Boolean,
            default: true,
        }
    },
    {
        timestamps: true,
    }
);

const ParkingLot = mongoose.model('ParkingLot', parkingLotSchema);
export default ParkingLot;
