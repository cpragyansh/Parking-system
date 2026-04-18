import mongoose from 'mongoose';

const slotSchema = mongoose.Schema(
    {
        parkingLotId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ParkingLot',
            required: true,
        },
        slotNumber: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ['CAR', 'BIKE', 'TRUCK'],
            required: true,
        },
        status: {
            type: String,
            enum: ['AVAILABLE', 'OCCUPIED', 'RESERVED'],
            default: 'AVAILABLE',
        },
        currentVehicle: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'VehicleEntry',
            default: null,
        }
    },
    {
        timestamps: true,
    }
);

const Slot = mongoose.model('Slot', slotSchema);
export default Slot;
