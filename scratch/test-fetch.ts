async function run() {
    try {
        console.log("Triggering live test email on glowbook.se...");
        const res = await fetch("https://glowbook.se/api/test-email?email=zofielyberg@gmail.com");
        const json = await res.json();
        console.log("Response:", JSON.stringify(json, null, 2));
    } catch(e) {
        console.error("Fetch failed:", e);
    }
}
run();
