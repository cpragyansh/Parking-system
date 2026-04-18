import User from '../models/User.js';

const seedSuperAdmin = async () => {
    try {
        const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@parkflow.com';
        const adminExists = await User.findOne({ email: adminEmail });

        if (!adminExists) {
            const superAdmin = new User({
                name: 'Super Admin',
                email: adminEmail,
                password: process.env.SUPER_ADMIN_PASSWORD || 'admin',
                role: 'SUPER_ADMIN',
            });
            await superAdmin.save();
            console.log('Super Admin seeded successfully');
        } else {
            console.log('Super Admin already exists');
        }
    } catch (error) {
        console.error('Error seeding Super Admin:', error);
    }
};

export default seedSuperAdmin;
