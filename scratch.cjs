const axios = require('axios');

async function test() {
    try {
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', { email: 'admin@parkflow.com', password: 'admin' });
        const token = loginRes.data.token;
        const user = loginRes.data;

        const res = await axios.post('http://localhost:5000/api/parking-lots', {
            name: "Test Center",
            address: "Test Addr",
            adminId: user._id,
            totalSlots: { car: 1, bike: 1, truck: 1 }
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.log("SUCCESS:", res.data);
    } catch (e) {
        console.error("FAIL:", e.response?.data || e.message);
    }
}
test();
