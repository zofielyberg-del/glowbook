fetch('http://localhost:3000/api/admin/seed-salons', {method: 'POST'}).then(res=>res.json()).then(res=>console.log(res)).catch(console.error);  
