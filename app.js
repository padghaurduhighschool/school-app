async function validateLogin(inputPhone, inputCode) {
    const sheetCsvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTtCtTy2UbnOJv3osixYzktVJK9QSUtJhSeeOmtol-efSarJWEaoNA8s-tppqTkM-jP0ZeBJ0DdGlfl/pub?gid=0&single=true&output=csv";
    const response = await fetch(sheetCsvUrl);
    const data = await response.text();
    
    // Simple CSV parser logic to check phone and 8-digit code
    const rows = data.split('\n').map(row => row.split(','));
    const user = rows.find(row => row[0] === inputPhone && row[1] === inputCode);

    if (user) {
        // user[3] is the Role (Super Admin, Teacher, Supervisor)
        const role = user[3].trim(); 
        const name = user[2].trim(); 

        localStorage.setItem('userRole', role);
        localStorage.setItem('userName', name);

        // Redirect based on Staff Role
        if (role === "Super Admin") {
            alert("Logging in as Super Admin..."); // [cite: 1]
        } else if (role === "Teacher") {
            alert("Logging in as Teacher..."); // [cite: 95]
        } else if (role === "Supervisor") {
            alert("Logging in as Supervisor..."); // [cite: 53]
        }

        window.location.reload(); 
    } else {
        alert("Credentials not found in school records.");
    }
}
