async function testVPS() {
  try {
    console.log('Sending request to VPS with duplicate WA...');
    const response = await fetch('https://pmi.payloads.web.id/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: "testVPS4@payloads.com", // Unique
            password: "Password123",
            whatsappNumber: "081234567892", // DUPLICATE (from previous run)
            nik: "1234567890123451",        // Unique
            fullName: "Relawan Test VPS 2"
        })
    });
    
    const data = await response.json();
    console.log("STATUS:", response.status);
    console.log("DATA:", data);
  } catch (error) {
    console.log("NETWORK ERROR:", error.message);
  }
}

testVPS();
