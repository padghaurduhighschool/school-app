// Configuration
const TEACHER_SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTtCtTy2UbnOJv3osixYzktVJK9QSUtJhSeeOmtol-efSarJWEaoNA8s-tppqTkM-jP0ZeBJ0DdGlfl/pub?gid=0&single=true&output=csv";

// 1. SPLASH SCREEN TO LOGIN [cite: 168-172]
setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    const login = document.getElementById('login-screen');
    if (splash && login) {
        splash.classList.add('hidden');
        login.classList.remove('hidden');
    }
}, 2000);

// 2. LOGIN LOGIC [cite: 97, 180-184]
async function handleLogin() {
    const phone = document.getElementById('phone').value;
    const code = document.getElementById('code').value;

    try {
        const response = await fetch(TEACHER_SHEET_CSV);
        const text = await response.text();
        const rows = text.split('\n').map(row => row.split(','));

        // Find user: Phone (Col A/Index 0) and Code (Col B/Index 1)
        const user = rows.find(row => row[0].trim() === phone && row[1].trim() === code);

        if (user) {
            const role = user[3].trim(); // Role is in Column D [cite: 182-184]
            const name = user[2].trim(); // Name is in Column C
            
            localStorage.setItem('userRole', role);
            localStorage.setItem('userName', name);
            localStorage.setItem('mappedClass', user[5] ? user[5].trim() : ""); // Column F

            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('main-app').classList.remove('hidden');
            loadSection('home');
        } else {
            alert("Credentials not found. Please contact the school office.");
        }
    } catch (error) {
        console.error("Login Error:", error);
    }
}

// 3. DYNAMIC DASHBOARD CONTENT [cite: 185]
function loadSection(section) {
    const content = document.getElementById('content');
    const role = localStorage.getItem('userRole');
    const name = localStorage.getItem('userName');
    
    document.getElementById('user-role-title').innerText = `${role} Dashboard`;

    if (section === 'home') {
        if (role === "Teacher") {
            // TEACHER HOME: Self Attendance Buttons 
            content.innerHTML = `
                <div class="space-y-4">
                    <h2 class="text-xl font-bold">Welcome, ${name}</h2>
                    <div class="grid grid-cols-2 gap-4">
                        <button onclick="markAttendance('IN')" class="bg-green-500 text-white p-6 rounded-2xl font-bold">Check IN</button>
                        <button onclick="markAttendance('OUT')" class="bg-red-500 text-white p-6 rounded-2xl font-bold">Check OUT</button>
                        <button onclick="markAttendance('Break OUT')" class="bg-yellow-500 text-white p-6 rounded-2xl font-bold">Break OUT</button>
                        <button onclick="markAttendance('Break IN')" class="bg-blue-500 text-white p-6 rounded-2xl font-bold">Break IN</button>
                    </div>
                    <div id="location-status" class="text-sm text-gray-600 mt-4 text-center italic">Checking location...</div>
                </div>
            `;
        } else {
            // ADMIN/SUPERVISOR HOME: Stats Cards [cite: 185]
            content.innerHTML = `
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-white p-4 rounded-xl shadow border-l-4 border-blue-600">
                        <p class="text-gray-500 text-sm">Today's Attendance</p>
                        <p class="text-2xl font-bold">95%</p>
                    </div>
                    <div class="bg-white p-4 rounded-xl shadow border-l-4 border-green-600">
                        <p class="text-gray-500 text-sm">Teachers Present</p>
                        <p class="text-2xl font-bold">12/15</p>
                    </div>
                </div>
            `;
        }
    }
}

// 4. GEOFENCING LOGIC (Placeholder for now) [cite: 99-100, 103]
function markAttendance(type) {
    alert(`Attendance marked as: ${type}\n(Proximity logic and Firebase logging goes here next)`);
}
