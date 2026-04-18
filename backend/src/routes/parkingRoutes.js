import express from 'express';
import ParkingLot from '../models/ParkingLot.js';
import Slot from '../models/Slot.js';
import PricingRule from '../models/PricingRule.js';
import VehicleEntry from '../models/VehicleEntry.js';
import { protect, superAdmin, admin } from '../middlewares/auth.js';

const router = express.Router();

// @route   POST /api/parking-lots
// @desc    Create a parking lot
// @access  Private/SuperAdmin
router.post('/', protect, superAdmin, async (req, res) => {
    try {
        const { name, address, adminId, totalSlots } = req.body;
        const parkingLot = new ParkingLot({
            name,
            address,
            adminId,
            totalSlots
        });
        const createdLot = await parkingLot.save();

        // Seed slots automatically based on totalSlots
        const slotTypes = ['car', 'bike', 'truck'];
        for (const type of slotTypes) {
            const count = totalSlots[type] || 0;
            const slotData = [];
            for (let i = 1; i <= count; i++) {
                slotData.push({
                    parkingLotId: createdLot._id,
                    slotNumber: `${type.toUpperCase()[0]}-${i}`,
                    type: type.toUpperCase(),
                    status: 'AVAILABLE'
                });
            }
            if (slotData.length > 0) {
                await Slot.insertMany(slotData);
            }
        }
        res.status(201).json(createdLot);
    } catch (error) {
        res.status(500).json({ message: 'Error creating parking lot', error: error.message });
    }
});

// @route   GET /api/parking-lots
// @desc    Get all parking lots
// @access  Private (SuperAdmin sees all, Admin sees owned, Operator sees current)
router.get('/', protect, async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'ADMIN') {
            query.adminId = req.user._id;
        } else if (req.user.role === 'OPERATOR') {
            query._id = req.user.parkingLotId;
        }

        const lots = await ParkingLot.find(query).lean().populate('adminId', 'name email');
        
        const augmentedLots = await Promise.all(lots.map(async (lot) => {
            const capacityAgg = await Slot.aggregate([
                { $match: { parkingLotId: lot._id } },
                { $group: { _id: { status: '$status', type: '$type' }, count: { $sum: 1 } } }
            ]);
            let capacityBreakdown = { CAR: { available: 0, occupied: 0 }, BIKE: { available: 0, occupied: 0 }, TRUCK: { available: 0, occupied: 0 } };
            let availableSlots = 0; let occupiedSlots = 0;
            capacityAgg.forEach(item => {
                if(item._id.status === 'AVAILABLE') { if(capacityBreakdown[item._id.type]) capacityBreakdown[item._id.type].available += item.count; availableSlots += item.count; }
                if(item._id.status === 'OCCUPIED') { if(capacityBreakdown[item._id.type]) capacityBreakdown[item._id.type].occupied += item.count; occupiedSlots += item.count; }
            });
            
            const revenueAgg = await VehicleEntry.aggregate([
                { $match: { parkingLotId: lot._id, status: 'COMPLETED' } },
                { $group: { _id: null, total: { $sum: '$chargesCalculated' } } }
            ]);
            const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

            return { ...lot, availableSlots, occupiedSlots, capacityBreakdown, totalRevenue };
        }));

        res.json(augmentedLots);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @route   GET /api/parking-lots/:id/slots
// @desc    Get live slots grid data
// @access  Private
router.get('/:id/slots', protect, async (req, res) => {
    try {
        const slots = await Slot.find({ parkingLotId: req.params.id }).populate('currentVehicle');
        res.json(slots);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   POST /api/parking-lots/:id/pricing
// @desc    Set pricing rule
// @access  Private/Admin
router.post('/:id/pricing', protect, admin, async (req, res) => {
    try {
        const { vehicleType, hourlyRate, firstXMinutesFree, flatRateOption, nightChargesMuliplier } = req.body;
        const pricing = await PricingRule.findOneAndUpdate(
            { parkingLotId: req.params.id, vehicleType },
            { hourlyRate, firstXMinutesFree, flatRateOption, nightChargesMuliplier },
            { new: true, upsert: true }
        );
        res.status(200).json(pricing);
    } catch (error) {
        res.status(500).json({ message: 'Error updating pricing', error: error.message });
    }
});

// @route   GET /api/parking-lots/:id/history
// @desc    Get parking history logs
// @access  Private
router.get('/:id/history', protect, async (req, res) => {
    try {
        const history = await VehicleEntry.find({ parkingLotId: req.params.id })
            .sort({ createdAt: -1 }); // newest first
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching history', error: error.message });
    }
});

// @route   DELETE /api/parking-lots/:id
// @desc    Delete a parking lot
// @access  Private/SuperAdmin
router.delete('/:id', protect, superAdmin, async (req, res) => {
    try {
        const lot = await ParkingLot.findById(req.params.id);
        if (!lot) return res.status(404).json({ message: 'Parking lot not found' });
        
        await Slot.deleteMany({ parkingLotId: req.params.id });
        await VehicleEntry.deleteMany({ parkingLotId: req.params.id });
        await PricingRule.deleteMany({ parkingLotId: req.params.id });
        await ParkingLot.findByIdAndDelete(req.params.id);
        
        res.json({ message: 'Parking lot removed' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting parking lot', error: error.message });
    }
});

export default router;
