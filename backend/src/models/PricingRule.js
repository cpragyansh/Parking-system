import mongoose from 'mongoose';

const pricingRuleSchema = mongoose.Schema(
    {
        parkingLotId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ParkingLot',
            required: true,
        },
        vehicleType: {
            type: String,
            enum: ['CAR', 'BIKE', 'TRUCK'],
            required: true,
        },
        hourlyRate: {
            type: Number,
            required: true,
        },
        firstXMinutesFree: {
            type: Number,
            default: 0,
        },
        flatRateOption: {
            type: Number,
            default: null, // If not null, this overrides hourly if certain condition met, or just exists as an option
        },
        nightChargesMuliplier: {
            type: Number,
            default: 1.0,
        }
    },
    {
        timestamps: true,
    }
);

const PricingRule = mongoose.model('PricingRule', pricingRuleSchema);
export default PricingRule;
