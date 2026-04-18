async function test() {
    try {
        const loginRes = await fetch('http://localhost:5000/api/auth/login', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@parkflow.com', password: 'admin' }) 
        });
        const loginData = await loginRes.json();
        const token = loginData.token;
        const user = loginData;

        const res = await fetch('http://localhost:5000/api/parking-lots', {
            method: 'POST',
            body: JSON.stringify({
                name: "Test Center",
                address: "Test Addr",
                adminId: user._id,
                totalSlots: { car: 1, bike: 1, truck: 1 }
            }),
            headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}` 
            }
        });
        const data = await res.json();
        console.log("STATUS:", res.status);
        console.log("SUCCESS:", data);
    } catch (e) {
        console.error("FAIL:", e);
    }
}
test();
