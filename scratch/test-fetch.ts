async function run() {
    try {
        const res = await fetch("https://sofiesrepository.vercel.app/api/test-email?email=zofielyberg@gmail.com");
        const json = await res.json();
        console.log(JSON.stringify(json, null, 2));
    } catch(e) {
        console.error(e);
    }
}
run();
