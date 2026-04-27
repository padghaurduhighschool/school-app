async function validateLogin(inputPhone, inputCode) {
    const sheetCsvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTtCtTy2UbnOJv3osixYzktVJK9QSUtJhSeeOmtol-efSarJWEaoNA8s-tppqTkM-jP0ZeBJ0DdGlfl/pub?gid=0&single=true&output=csv";
    const response = await fetch(sheetCsvUrl);
    const data = await response.text();
    
    // Simple CSV parser logic to check phone and 8-digit code
    const rows = data.split('\n').map(row => row.split(','));
    const user = rows.find(row => row[0] === inputPhone && row[1] === inputCode);

    if (user) {
        // user[2] would be the Role column (Admin, Teacher, or Parent)
        localStorage.setItem('userRole', user[2]); 
        window.location.reload(); // Refresh to show the correct dashboard
    } else {
        alert("Credentials not found in school records.");
    }
}
