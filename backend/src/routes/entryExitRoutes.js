import express from 'express';
import Slot from '../models/Slot.js';
import VehicleEntry from '../models/VehicleEntry.js';
import PricingRule from '../models/PricingRule.js';
import { protect } from '../middlewares/auth.js';
import crypto from 'crypto';

const router = express.Router();

// Helper to generate unique ticket ID
const generateTicketId = () => crypto.randomBytes(4).toString('hex').toUpperCase();

// @route   POST /api/entry
// @desc    Register a new vehicle entry
// @access  Private (Operator)
router.post('/entry', protect, async (req, res) => {
    try {
        const { vehicleNumber, vehicleType, parkingLotId, driverPhone } = req.body;

        // Check if vehicle is already active
        const activeEntry = await VehicleEntry.findOne({ vehicleNumber, status: 'ACTIVE' });
        if (activeEntry) {
            return res.status(400).json({ message: 'Vehicle already parked/active' });
        }

        // Find nearest available slot
        const availableSlot = await Slot.findOne({ 
            parkingLotId, 
            type: vehicleType.toUpperCase(), 
            status: 'AVAILABLE' 
        }).sort({ slotNumber: 1 });

        if (!availableSlot) {
            return res.status(404).json({ message: `No available slots for ${vehicleType}` });
        }

        const ticketId = generateTicketId();

        // Create Entry
        const entry = new VehicleEntry({
            parkingLotId,
            slotId: availableSlot._id,
            vehicleNumber,
            vehicleType: vehicleType.toUpperCase(),
            ticketId,
            driverPhone: driverPhone || ''
        });
        await entry.save();

        // Update Slot
        availableSlot.status = 'OCCUPIED';
        availableSlot.currentVehicle = entry._id;
        await availableSlot.save();

        // Emit socket event for live grid update
        req.io.to(parkingLotId.toString()).emit('slot_updated', {
            slotId: availableSlot._id,
            status: 'OCCUPIED',
            vehicleEntry: entry
        });

        res.status(201).json({ ...entry.toObject(), slotNumber: availableSlot.slotNumber });
    } catch (error) {
        res.status(500).json({ message: 'Server Error during entry', error: error.message });
    }
});

// @route   POST /api/exit/calculate
// @desc    Calculate bill before exit
// @access  Private (Operator)
router.post('/calculate', protect, async (req, res) => {
    try {
        const { ticketId, vehicleNumber } = req.body;
        
        let query = { status: 'ACTIVE' };
        if (ticketId) query.ticketId = ticketId;
        else if (vehicleNumber) query.vehicleNumber = vehicleNumber;
        else return res.status(400).json({ message: 'Provide ticketId or vehicleNumber' });

        const entry = await VehicleEntry.findOne(query);
        if (!entry) return res.status(404).json({ message: 'Active entry not found' });

        const exitTime = new Date();
        const durationMinutes = Math.ceil((exitTime - entry.entryTime) / (1000 * 60));

        // Fetch pricing rule
        const pricing = await PricingRule.findOne({ parkingLotId: entry.parkingLotId, vehicleType: entry.vehicleType });
        
        let chargesCalculated = 0;
        let billableMinutes = durationMinutes;

        // Base rate fallbacks if admin hasn't set custom pricing yet
        const defaultRates = { CAR: 50, BIKE: 20, TRUCK: 100 };
        const hourlyRate = pricing ? pricing.hourlyRate : defaultRates[entry.vehicleType] || 50;

        if (pricing && pricing.firstXMinutesFree && durationMinutes <= pricing.firstXMinutesFree) {
            chargesCalculated = 0;
        } else {
            if (pricing && pricing.flatRateOption) {
                chargesCalculated = pricing.flatRateOption;
            } else {
                // Minimum charge of 1 hour
                const hours = Math.max(1, Math.ceil(billableMinutes / 60));
                chargesCalculated = hours * hourlyRate;
            }
        }

        res.json({ entry, durationMinutes, chargesCalculated, exitTime });
    } catch (error) {
        res.status(500).json({ message: 'Server Error during calculation', error: error.message });
    }
});

// @route   POST /api/exit/confirm
// @desc    Confirm exit and free slot
// @access  Private (Operator)
router.post('/confirm', protect, async (req, res) => {
    try {
        const { entryId, chargesCalculated } = req.body;

        const entry = await VehicleEntry.findById(entryId);
        if (!entry || entry.status === 'COMPLETED') {
            return res.status(400).json({ message: 'Invalid or completed entry' });
        }

        entry.exitTime = new Date();
        entry.chargesCalculated = chargesCalculated;
        entry.paymentStatus = 'PAID';
        entry.status = 'COMPLETED';
        await entry.save();

        const slot = await Slot.findById(entry.slotId);
        if (slot) {
            slot.status = 'AVAILABLE';
            slot.currentVehicle = null;
            await slot.save();

            // Emit socket event
            req.io.to(slot.parkingLotId.toString()).emit('slot_updated', {
                slotId: slot._id,
                status: 'AVAILABLE',
                vehicleEntry: null
            });
        }

        res.json({ message: 'Exit successful', entry });
    } catch (error) {
        res.status(500).json({ message: 'Server Error during exit', error: error.message });
    }
});

export default router;
