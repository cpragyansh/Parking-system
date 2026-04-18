import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import ParkingLot from './models/ParkingLot.js';
import Slot from './models/Slot.js';
import VehicleEntry from './models/VehicleEntry.js';

dotenv.config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/parkflow');
        console.log("Connected to DB.");

        let user = await User.findOne({ email: 'admin@parkflow.com' });
        if (!user) {
            console.log("Super Admin not found. Please start backend server normally first.");
            process.exit(1);
        }

        // 1. Create Demo Lot
        const lot = new ParkingLot({
            name: "Galaxy Tech Park",
            address: "404 Main Boulevard, NY",
            adminId: user._id,
            totalSlots: { car: 20, bike: 12, truck: 4 }
        });
        await lot.save();

        // 2. Insert Base Slots
        const slotData = [];
        const slotTypes = ['car', 'bike', 'truck'];
        for (const type of slotTypes) {
            const count = lot.totalSlots[type];
            for (let i = 1; i <= count; i++) {
                slotData.push({
                    parkingLotId: lot._id,
                    slotNumber: `${type.toUpperCase()[0]}-${i}`,
                    type: type.toUpperCase(),
                    status: 'AVAILABLE'
                });
            }
        }
        const insertedSlots = await Slot.insertMany(slotData);
        const randomSlot = insertedSlots[0]._id;

        // 3. Inject Historical Revenue Data (Completed Entries)
        console.log("Generating rich history & revenue data...");
        const pastEntries = [];
        for (let i = 0; i < 45; i++) {
            // Random vehicle
            const vType = i % 7 === 0 ? 'TRUCK' : (i % 2 === 0 ? 'BIKE' : 'CAR');
            const duration = Math.floor(Math.random() * 300) + 45; // 45 to 345 mins
            const daysAgo = Math.floor(Math.random() * 30); // within last 30 days
            
            const entryTime = new Date();
            entryTime.setDate(entryTime.getDate() - daysAgo);
            entryTime.setHours(entryTime.getHours() - (duration/60));
            const exitTime = new Date(entryTime.getTime() + duration * 60000);

            // Compute hypothetical cost based on standard fallback tier
            let rate = 50;
            if (vType === 'BIKE') rate = 20;
            if (vType === 'TRUCK') rate = 100;
            const hours = Math.ceil(duration / 60);
            const charges = hours * rate;

            pastEntries.push({
                parkingLotId: lot._id,
                vehicleNumber: `AB${10 + i}CD${1000 + i}`,
                vehicleType: vType,
                entryTime,
                exitTime,
                durationMinutes: duration,
                chargesCalculated: charges,
                status: 'COMPLETED',
                slotId: randomSlot,
                ticketId: `TD-${Date.now().toString().slice(-4)}${i}`
            });
        }
        await VehicleEntry.insertMany(pastEntries);

        // 4. Inject Active Parking (Live Vehicles)
        console.log("Occupying slots with live vehicles...");
        const availableSlots = await Slot.find({ parkingLotId: lot._id });
        let activeCount = 0;

        for(let slot of availableSlots) {
            // 60% chance to have a vehicle
            if(Math.random() > 0.4) {
                const entry = new VehicleEntry({
                    parkingLotId: lot._id,
                    vehicleNumber: `LIVE${8000 + activeCount}`,
                    vehicleType: slot.type,
                    entryTime: new Date(Date.now() - Math.floor(Math.random() * 150) * 60000), // entered 0-2.5 hours ago
                    status: 'ACTIVE',
                    slotId: slot._id,
                    ticketId: `LIVE-${Date.now().toString().slice(-4)}${activeCount}`
                });
                await entry.save();
                
                slot.status = 'OCCUPIED';
                slot.currentVehicle = entry._id;
                await slot.save();
                activeCount++;
            }
        }

        console.log(`Seeding Complete! => Created ${pastEntries.length} history receipts and ${activeCount} active live vehicles inside 'Galaxy Tech Park'.`);
        process.exit(0);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

seedData();
