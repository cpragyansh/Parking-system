import mongoose from 'mongoose';

const vehicleEntrySchema = mongoose.Schema(
    {
        parkingLotId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ParkingLot',
            required: true,
        },
        slotId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Slot',
            required: true,
        },
        vehicleNumber: {
            type: String,
            required: true,
        },
        driverPhone: {
            type: String,
            default: '',
        },
        vehicleType: {
            type: String,
            enum: ['CAR', 'BIKE', 'TRUCK'],
            required: true,
        },
        entryTime: {
            type: Date,
            default: Date.now,
        },
        exitTime: {
            type: Date,
            default: null,
        },
        status: {
            type: String,
            enum: ['ACTIVE', 'COMPLETED'],
            default: 'ACTIVE',
        },
        ticketId: {
            type: String,
            required: true,
            unique: true,
        },
        chargesCalculated: {
            type: Number,
            default: 0,
        },
        paymentStatus: {
            type: String,
            enum: ['PENDING', 'PAID'],
            default: 'PENDING',
        }
    },
    {
        timestamps: true,
    }
);

const VehicleEntry = mongoose.model('VehicleEntry', vehicleEntrySchema);
export default VehicleEntry;
