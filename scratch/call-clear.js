fetch('http://localhost:3000/api/admin/clear-db', {method: 'POST'}).then(res=>res.json()).then(res=>console.log(res.error));  
