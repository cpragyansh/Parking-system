import express from 'express';
import Slot from '../models/Slot.js';
import VehicleEntry from '../models/VehicleEntry.js';
import { protect } from '../middlewares/auth.js';
import mongoose from 'mongoose';

const router = express.Router();

// @route   GET /api/analytics/:parkingLotId
// @desc    Get complete analytics for a specific parking lot
// @access  Private
router.get('/:parkingLotId', protect, async (req, res) => {
    try {
        const { parkingLotId } = req.params;

        // 1. Current Capacity (Vacancy)
        const slotsObj = await Slot.aggregate([
            { $match: { parkingLotId: req.params.parkingLotId } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        
        // Wait, req.params.parkingLotId is a string, but slot aggregates use ObjectId, need mongoose.Types.ObjectId.
        // I will use standard mongoose queries instead of aggregates for simplicity and robustness.
        
        const objectId = new mongoose.Types.ObjectId(parkingLotId);

        const capacityAgg = await Slot.aggregate([
            { $match: { parkingLotId: objectId } },
            { $group: { _id: { status: '$status', type: '$type' }, count: { $sum: 1 } } }
        ]);

        let capacityBreakdown = { CAR: { available: 0, occupied: 0 }, BIKE: { available: 0, occupied: 0 }, TRUCK: { available: 0, occupied: 0 } };
        let availableSlots = 0; let occupiedSlots = 0; let totalSlots = 0;

        capacityAgg.forEach(item => {
            const status = item._id.status; // 'AVAILABLE'
            const type = item._id.type; // 'CAR'
            if(status === 'AVAILABLE') { if(capacityBreakdown[type]) capacityBreakdown[type].available += item.count; availableSlots += item.count; }
            if(status === 'OCCUPIED') { if(capacityBreakdown[type]) capacityBreakdown[type].occupied += item.count; occupiedSlots += item.count; }
            totalSlots += item.count;
        });
        
        // 2. Global Total Revenue
        const totalRevenueAgg = await VehicleEntry.aggregate([
            { $match: { parkingLotId: objectId, status: 'COMPLETED' } },
            { $group: { _id: null, total: { $sum: '$chargesCalculated' } } }
        ]);
        const totalRevenue = totalRevenueAgg.length > 0 ? totalRevenueAgg[0].total : 0;

        // 3. Revenue Grouped by Vehicle Type
        const revenueByType = await VehicleEntry.aggregate([
            { $match: { parkingLotId: objectId, status: 'COMPLETED' } },
            { $group: { _id: '$vehicleType', total: { $sum: '$chargesCalculated' } } }
        ]);

        // 4. Revenue By Date (Daily)
        const revenueByDate = await VehicleEntry.aggregate([
            { $match: { parkingLotId: objectId, status: 'COMPLETED' } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$exitTime" } },
                    total: { $sum: "$chargesCalculated" }
                }
            },
            { $sort: { _id: -1 } }
        ]);

        // 5. Revenue By Month (Monthly)
        const revenueByMonth = await VehicleEntry.aggregate([
            { $match: { parkingLotId: objectId, status: 'COMPLETED' } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$exitTime" } },
                    total: { $sum: "$chargesCalculated" }
                }
            },
            { $sort: { _id: -1 } }
        ]);

        res.json({
            capacity: { total: totalSlots, available: availableSlots, occupied: occupiedSlots, breakdown: capacityBreakdown },
            totalRevenue,
            revenueByType,
            revenueByDate,
            revenueByMonth
        });

    } catch (error) {
        res.status(500).json({ message: 'Error fetching analytics', error: error.message });
    }
});

export default router;
