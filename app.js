// 1. CONFIGURATION & STATE
const TEACHER_SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTtCtTy2UbnOJv3osixYzktVJK9QSUtJhSeeOmtol-efSarJWEaoNA8s-tppqTkM-jP0ZeBJ0DdGlfl/pub?gid=0&single=true&output=csv";
const OFFICE_LAT = 19.2435; 
const OFFICE_LON = 73.1234; 
let deferredPrompt;

// 2. STARTUP LOGIC (Splash vs Dashboard)
window.onload = () => {
    const savedRole = localStorage.getItem('userRole');
    
    setTimeout(() => {
        document.getElementById('splash-screen').classList.add('hidden');
        if (savedRole) {
            document.getElementById('main-app').classList.remove('hidden');
            loadSection('home');
        } else {
            document.getElementById('login-screen').classList.remove('hidden');
        }
    }, 2000);
};

// 3. PWA INSTALLATION EVENT
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('install-button-container');
    if (installBtn) installBtn.classList.remove('hidden');
});

// 4. LOGIN LOGIC
window.handleLogin = async function() {
    const phone = document.getElementById('phone').value;
    const code = document.getElementById('code').value;

    try {
        const response = await fetch(TEACHER_SHEET_CSV);
        const text = await response.text();
        const rows = text.split('\n').map(row => row.split(','));
        const user = rows.find(row => row[0].trim() === phone && row[1].trim() === code);

        if (user) {
            localStorage.setItem('userRole', user[3].trim());
            localStorage.setItem('userName', user[2].trim());
            localStorage.setItem('mappedClass', user[5] ? user[5].trim() : "");

            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('main-app').classList.remove('hidden');
            loadSection('home');
        } else {
            alert("Credentials not found. Please contact the school office.");
        }
    } catch (error) {
        alert("Login failed. Check your internet.");
    }
};

// 5. DASHBOARD NAVIGATION
window.loadSection = (section) {
    const content = document.getElementById('content');
    const role = localStorage.getItem('userRole');
    const name = localStorage.getItem('userName');
    document.getElementById('user-role-title').innerText = `${role} Dashboard`;

    if (section === 'home') {
        if (role === "Teacher") {
            content.innerHTML = `
                <div class="space-y-4">
                    <h2 class="text-xl font-bold">Welcome, ${name}</h2>
                    <div class="grid grid-cols-2 gap-4">
                        <button onclick="markAttendance('IN')" class="bg-green-500 text-white p-6 rounded-2xl font-bold shadow-lg active:scale-95">Check IN</button>
                        <button onclick="markAttendance('OUT')" class="bg-red-500 text-white p-6 rounded-2xl font-bold shadow-lg active:scale-95">Check OUT</button>
                        <button onclick="markAttendance('Break OUT')" class="bg-yellow-500 text-white p-6 rounded-2xl font-bold shadow-lg active:scale-95">Break OUT</button>
                        <button onclick="markAttendance('Break IN')" class="bg-blue-500 text-white p-6 rounded-2xl font-bold shadow-lg active:scale-95">Break IN</button>
                    </div>
                    <div id="location-status" class="text-sm text-gray-600 mt-4 text-center italic">Ready to mark attendance.</div>
                </div>
            `;
        } else {
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
    } else if (section === 'more') {
        content.innerHTML = `
            <div class="bg-white rounded-2xl shadow-sm p-4 space-y-4">
                <div class="border-b pb-4">
                    <p class="text-sm text-gray-500 font-medium">STAFF DETAILS</p>
                    <p class="font-bold text-lg text-blue-600">${name} (${role})</p>
                </div>
                <div id="install-button-container" class="${deferredPrompt ? '' : 'hidden'}">
                    <button onclick="triggerInstall()" class="w-full bg-blue-600 text-white p-5 rounded-2xl font-bold flex items-center justify-between shadow-md">
                        <span>📲 Install App on Phone</span>
                        <span class="text-xs bg-white text-blue-600 px-2 py-1 rounded">INSTALL</span>
                    </button>
                </div>
                <button onclick="handleLogout()" class="w-full bg-red-50 text-red-600 p-5 rounded-2xl font-bold flex items-center justify-center border border-red-100 shadow-sm active:bg-red-100">
                    <span class="mr-2">🚪</span> Logout from System
                </button>
            </div>
        `;
    }
}

// 6. ATTENDANCE & GEOLOCATION
window.markAttendance = (type) {
    const statusDiv = document.getElementById('location-status');
    statusDiv.innerText = "📍 Locating your position...";

    navigator.geolocation.getCurrentPosition((position) => {
        const distance = calculateDistance(position.coords.latitude, position.coords.longitude, OFFICE_LAT, OFFICE_LON);
        let msg = `You are ${Math.round(distance)}m from the office.`;
        
        if (distance > 10) {
            if (confirm(msg + "\n\nYou are outside the 10m range. Mark anyway?")) {
                saveToDatabase(type, distance);
            }
        } else {
            saveToDatabase(type, distance);
        }
        statusDiv.innerText = `Last action: ${type} at ${new Date().toLocaleTimeString()}`;
    }, () => {
        alert("Location Access Denied. Please enable GPS.");
    }, { enableHighAccuracy: true });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2)**2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

function saveToDatabase(type, dist) {
    // Firebase implementation will go here
    alert(`Success: ${type} logged!`);
}

window.triggerInstall = () {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
        deferredPrompt = null;
        document.getElementById('install-button-container').classList.add('hidden');
    }
}

window.handleLogout = () {
    if (confirm("Sign out of the system?")) {
        localStorage.clear();
        location.reload();
    }
}
