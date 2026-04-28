{

// 1. CONFIGURATION & STATE
const TEACHER_SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTtCtTy2UbnOJv3osixYzktVJK9QSUtJhSeeOmtol-efSarJWEaoNA8s-tppqTkM-jP0ZeBJ0DdGlfl/pub?gid=0&single=true&output=csv";
const OFFICE_LAT = 19.2435; 
const OFFICE_LON = 73.1234; 
let deferredPrompt;

// 2. STARTUP LOGIC (Splash vs Dashboard)
window.onload = () => {
    const savedRole = localStorage.getItem('userRole');
    
    // --- ADD THIS RESET LOGIC ---
    const today = new Date().toISOString().split('T')[0];
    const lastDate = localStorage.getItem('lastActivityDate');
    if (lastDate !== today) {
        localStorage.setItem('hasCheckedInToday', 'false');
        localStorage.setItem('lastActivityDate', today);
    }
    // ----------------------------

    setTimeout(() => {
        document.getElementById('splash-screen').classList.add('hidden');
        if (savedRole) {
            document.getElementById('main-app').classList.remove('hidden');
            // Suggestion: Start them on 'attendance' so they can check in immediately
            loadSection('attendance'); 
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
window.loadSection = (section) => {
    const content = document.getElementById('content');
    const role = localStorage.getItem('userRole');
    const name = localStorage.getItem('userName');
    document.getElementById('user-role-title').innerText = `${role} Dashboard`;

if (section === 'home') {
        content.innerHTML = `
            <div class="space-y-4">
                <div class="bg-blue-600 p-6 rounded-2xl text-white shadow-lg">
                    <h2 class="text-2xl font-bold">Hello, ${name}</h2>
                    <p class="opacity-90">Padgha Urdu High School ERP</p>
                </div>
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <h3 class="font-bold mb-2">School Notices</h3>
                    <p class="text-sm text-gray-500 italic">No new notices for today.</p>
                </div>
            </div>
        `;
    }
    
    if (section === 'attendance') {
        if (role === "Teacher") {
            const hasCheckedIn = localStorage.getItem('hasCheckedInToday') === 'true';

    content.innerHTML = `
        <div class="space-y-4">
            <h2 class="text-xl font-bold">Welcome, ${name}</h2>
            <div class="grid grid-cols-1 gap-4">
                <button id="btn-in" onclick="markAttendance('IN')" 
                    ${hasCheckedIn ? 'disabled' : ''} 
                    class="w-full p-6 rounded-2xl font-bold shadow-lg transition-all
                    ${hasCheckedIn ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-500 text-white active:scale-95'}">
                    ${hasCheckedIn ? '✅ Already Checked IN' : 'Check IN'}
                </button>

                <button id="btn-out" onclick="markAttendance('OUT')" 
                    ${!hasCheckedIn ? 'disabled' : ''} 
                    class="w-full p-6 rounded-2xl font-bold shadow-lg transition-all
                    ${!hasCheckedIn ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-red-500 text-white active:scale-95'}">
                    Check OUT
                </button>
            </div>
            <div id="location-status" class="text-sm text-gray-600 mt-4 text-center italic">
                ${hasCheckedIn ? 'You are currently on duty.' : 'Ready to mark attendance.'}
            </div>
        </div>
    `;
        } else {
                content.innerHTML = `
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-600">
                            <p class="text-gray-500 text-xs uppercase font-bold">Today's Logs</p>
                            <p id="total-logs" class="text-2xl font-bold">0</p>
                        </div>
                        <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-orange-500">
                            <p class="text-gray-500 text-xs uppercase font-bold">Outside 10m</p>
                            <p id="outside-logs" class="text-2xl font-bold">0</p>
                        </div>
                    </div>
                    
                    <h3 class="font-bold text-gray-700 flex items-center">
                        <span class="mr-2">📋</span> Live Attendance Feed
                    </h3>
                    <button onclick="downloadReport()" class="text-xs bg-green-600 text-white px-3 py-2 rounded-lg font-bold shadow-sm flex items-center">
                <span class="mr-1">📥</span> Download CSV
            </button>
                    
                    <div id="attendance-list" class="space-y-3">
                        <div class="text-center py-10 text-gray-400 italic">Loading logs...</div>
                    </div>
                    
                </div>
            `;
            // Trigger the data fetch
            fetchAttendanceLogs();
        }
    } 
    
    else if (section === 'more') {
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
window.markAttendance = (type) => {
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

window.saveToDatabase = (type, dist) => {
    const name = localStorage.getItem('userName');
    const role = localStorage.getItem('userRole');
    const dateKey = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

    // Create a path: attendance/2024-05-20
    const attendanceRef = firebase.database().ref('attendance/' + dateKey);

    attendanceRef.push({
        name: name,
        role: role,
        type: type,
        distance: Math.round(dist) + "m",
        time: new Date().toLocaleTimeString(),
        timestamp: firebase.database.ServerValue.TIMESTAMP
    })
.then(() => {
    if (type === 'IN') localStorage.setItem('hasCheckedInToday', 'true');
    else if (type === 'OUT') localStorage.setItem('hasCheckedInToday', 'false');
    
    // Stay on the attendance tab to see the button change
    loadSection('attendance');
    alert(`Success: ${type} logged!`);
})
    .catch((error) => {
        alert("Database Error: " + error.message);
    });
};

window.triggerInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
        deferredPrompt = null;
        document.getElementById('install-button-container').classList.add('hidden');
    }
}

window.fetchAttendanceLogs = () => {
    const dateKey = new Date().toISOString().split('T')[0];
    const listDiv = document.getElementById('attendance-list');
    const totalCount = document.getElementById('total-logs');
    const outsideCount = document.getElementById('outside-logs');

    // Listen to today's attendance folder
    firebase.database().ref('attendance/' + dateKey).on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            listDiv.innerHTML = `<div class="bg-white p-6 rounded-xl text-center text-gray-500">No attendance marked yet today.</div>`;
            return;
        }

        let html = '';
        let total = 0;
        let outside = 0;

        // Convert object to array and reverse to see newest first
        const logs = Object.values(data).reverse();

        logs.forEach(log => {
            total++;
            const isOutside = parseInt(log.distance) > 10;
            if (isOutside) outside++;

            html += `
                <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-bold text-gray-800">${log.name}</p>
                            <p class="text-xs text-gray-500">${log.time} • ${log.type}</p>
                        </div>
                        <span class="px-2 py-1 rounded text-[10px] font-bold ${isOutside ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}">
                            ${log.distance}
                        </span>
                    </div>
                </div>
            `;
        });

        listDiv.innerHTML = html;
        totalCount.innerText = total;
        outsideCount.innerText = outside;
    });
};

window.downloadReport = () => {
    const dateKey = new Date().toISOString().split('T')[0];
    
    // Fetch data from Firebase one last time to ensure we have everything
    firebase.database().ref('attendance/' + dateKey).once('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            alert("No data available to download for today.");
            return;
        }

        // 1. Create CSV Header
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Name,Type,Time,Distance,Role\n";

        // 2. Add Rows
        Object.values(data).forEach(log => {
            const row = `"${log.name}","${log.type}","${log.time}","${log.distance}","${log.role}"`;
            csvContent += row + "\n";
        });

        // 3. Create a hidden link and trigger the download
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Attendance_Report_${dateKey}.csv`);
        document.body.appendChild(link);

        link.click(); // This starts the download
        document.body.removeChild(link);
    });
};
    
window.handleLogout = () => {
    if (confirm("Sign out of the system?")) {
        localStorage.clear();
        location.reload();
    }
}


}
