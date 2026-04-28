{

// 1. CONFIGURATION & STATE
const TEACHER_SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTtCtTy2UbnOJv3osixYzktVJK9QSUtJhSeeOmtol-efSarJWEaoNA8s-tppqTkM-jP0ZeBJ0DdGlfl/pub?gid=0&single=true&output=csv";
const OFFICE_LAT = 19.2435; 
const OFFICE_LON = 73.1234; 
let deferredPrompt;

// 2. STARTUP LOGIC (Splash vs Dashboard)
window.onload = () => {
    const today = new Date();
    const dateKey = today.toISOString().split('T')[0];
    const isSunday = today.getDay() === 0; // 0 is Sunday
    
    // Reset daily status
    if (localStorage.getItem('lastActivityDate') !== dateKey) {
        localStorage.setItem('hasCheckedInToday', 'false');
        localStorage.setItem('lastActivityDate', dateKey);
    }

    // Save Sunday status to use in loadSection
    localStorage.setItem('isSunday', isSunday);

    setTimeout(() => {
        document.getElementById('splash-screen').classList.add('hidden');
        if (localStorage.getItem('userRole')) {
            document.getElementById('main-app').classList.remove('hidden');
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
        const now = new Date();
        const day = now.getDay(); // 0=Sun, 5=Fri, 6=Sat
        const time = now.getHours() * 100 + now.getMinutes(); // e.g., 7:20 -> 720
        
        const isSunday = day === 0;
        const hasCheckedIn = localStorage.getItem('hasCheckedInToday') === 'true';

        // Define Rules
        const isTooEarly = time < 710; // Block before 7:10 AM
        
        // Logic for Short Day (Example: Friday = Day 5)
        const isShortDay = (day === 5); 
        const closingTime = isShortDay ? 1045 : 1300;
        const closingLabel = isShortDay ? "10:45 AM" : "01:00 PM";

        if (isSunday) {
            content.innerHTML = `<div class="p-10 text-center bg-white rounded-2xl shadow-sm">
                <p class="text-4xl mb-4">🏠</p>
                <p class="font-bold text-lg">Today is Sunday</p>
                <p class="text-gray-500">School is closed. Enjoy your holiday!</p>
            </div>`;
            return;
        }

        content.innerHTML = `
            <div class="space-y-4">
                <div class="bg-gray-100 p-3 rounded-lg text-center text-xs font-bold text-gray-600">
                    Shift: 07:20 AM to ${closingLabel}
                </div>
                <div class="grid grid-cols-1 gap-4">
                    <button id="btn-in" onclick="markAttendance('IN')" 
                        ${hasCheckedIn || isTooEarly ? 'disabled' : ''} 
                        class="w-full p-6 rounded-2xl font-bold shadow-lg transition-all
                        ${hasCheckedIn || isTooEarly ? 'bg-gray-300 text-gray-500' : 'bg-green-500 text-white active:scale-95'}">
                        ${isTooEarly ? 'Too Early to Check IN' : (hasCheckedIn ? '✅ Already Checked IN' : 'Check IN')}
                    </button>

                    <button id="btn-out" onclick="markAttendance('OUT')" 
                        ${!hasCheckedIn ? 'disabled' : ''} 
                        class="w-full p-6 rounded-2xl font-bold shadow-lg transition-all
                        ${!hasCheckedIn ? 'bg-gray-300 text-gray-500' : 'bg-red-500 text-white active:scale-95'}">
                        Check OUT
                    </button>
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
                <button onclick="downloadReport()" class="flex-1 bg-blue-600 text-white p-3 rounded-xl font-bold text-xs">
                    📥 Daily Report (CSV)
                </button>
                <button onclick="downloadMonthlyReport()" class="flex-1 bg-green-600 text-white p-3 rounded-xl font-bold text-xs">
                    📅 Monthly Report (Excel)
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
    const now = new Date();
    const timeNum = now.getHours() * 100 + now.getMinutes();
    statusDiv.innerText = "📍 Locating your position...";
    let statusPrefix = "";
    if (type === 'IN' && timeNum > 720) {
        statusPrefix = "[LATE] ";
    }
    navigator.geolocation.getCurrentPosition((position) => {
        const distance = calculateDistance(position.coords.latitude, position.coords.longitude, OFFICE_LAT, OFFICE_LON);
        let msg = `You are ${Math.round(distance)}m from the office.`;
        
        if (distance > 10) {
            if (confirm(msg + "\n\nYou are outside the 10m range. Mark anyway?")) {
                saveToDatabase(statusPrefix + type, distance);
            }
        } else {
            saveToDatabase(statusPrefix + type, distance);
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

        let tableHtml = `
    <table class="w-full bg-white rounded-lg overflow-hidden shadow-sm text-sm">
        <thead class="bg-gray-50 border-b">
            <tr>
                <th class="p-3 text-left">Staff Name</th>
                <th class="p-3 text-left">Action</th>
                <th class="p-3 text-left">Time</th>
                <th class="p-3 text-left">Dist.</th>
            </tr>
        </thead>
        <tbody>`;
        
        // Convert object to array and reverse to see newest first
        const logs = Object.values(data).reverse();

logs.forEach(log => {
    tableHtml += `
        <tr class="border-b">
            <td class="p-3 font-bold">${log.name}</td>
            <td class="p-3">${log.type}</td>
            <td class="p-3">${log.time}</td>
            <td class="p-3 text-xs">${log.distance}</td>
        </tr>`;
});
tableHtml += `</tbody></table>`;
        

        listDiv.innerHTML = html;
        listDiv.innerHTML = tableHtml;
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

window.downloadMonthlyReport = () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const daysInMonth = new Date(year, month, 0).getDate();

    // Fetch the entire month of attendance
    firebase.database().ref('attendance').once('value', (snapshot) => {
        const allData = snapshot.val(); // Contains all dates
        if (!allData) return alert("No data found.");

        const report = {}; // Structure: { "Name": { "Day1_IN": "", "Day1_OUT": "" } }

        // Process all dates in the database
        Object.keys(allData).forEach(dateStr => {
            if (dateStr.startsWith(`${year}-${month.toString().padStart(2, '0')}`)) {
                const day = parseInt(dateStr.split('-')[2]);
                const logs = Object.values(allData[dateStr]);

                logs.forEach(log => {
                    if (!report[log.name]) report[log.name] = {};
                    // Store the time for that specific day and type
                    report[log.name][`${day}_${log.type}`] = log.time;
                });
            }
        });

        // 1. Create CSV Header (Name, 1 April IN, 1 April OUT, 2 April IN...)
        let csvContent = "data:text/csv;charset=utf-8,Staff Name";
        for (let i = 1; i <= daysInMonth; i++) {
            csvContent += `,${i} April IN,${i} April OUT`;
        }
        csvContent += "\n";

        // 2. Add Employee Rows
        Object.keys(report).forEach(staffName => {
            let row = `"${staffName}"`;
            for (let i = 1; i <= daysInMonth; i++) {
                const checkIn = report[staffName][`${i}_IN`] || "-";
                const checkOut = report[staffName][`${i}_OUT`] || "-";
                row += `,${checkIn},${checkOut}`;
            }
            csvContent += row + "\n";
        });

        // 3. Download
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Monthly_Report_${month}_${year}.csv`);
        document.body.appendChild(link);
        link.click();
    });
};

    
window.handleLogout = () => {
    if (confirm("Sign out of the system?")) {
        localStorage.clear();
        location.reload();
    }
}


}
