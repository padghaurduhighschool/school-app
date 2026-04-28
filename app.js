{

// 1. CONFIGURATION & STATE
const TEACHER_SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTtCtTy2UbnOJv3osixYzktVJK9QSUtJhSeeOmtol-efSarJWEaoNA8s-tppqTkM-jP0ZeBJ0DdGlfl/pub?gid=0&single=true&output=csv";
const STUDENT_SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS7GzBg3WiApNvwB_2QNVFuNmX4RaPmkOawPtP6MR_DZ9JJOzTuNRV2mbY4rlesK0yn5zIHYXPyjDmB/pub?gid=0&single=true&output=csv"; 
const OFFICE_LAT = 19.2435; 
const OFFICE_LON = 73.1234; 
let deferredPrompt;

const formatTime12 = (date) => {
    return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
    });
};
    
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
window.loadSection = (section) => {
    const content = document.getElementById('content');
    const role = localStorage.getItem('userRole');
    const name = localStorage.getItem('userName');
    document.getElementById('user-role-title').innerText = `${role} Dashboard`;

if (section === 'home') {
    if (["Supervisor", "Clerk", "Super Admin", "Admin"].includes(role)) {
        content.innerHTML = `
            <div class="space-y-4">
                <div class="bg-blue-600 p-6 rounded-2xl text-white shadow-lg">
                    <h2 class="text-xl font-bold">School Overview</h2>
                    <p class="text-xs opacity-80">${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
                        <p class="text-gray-500 text-[10px] uppercase font-bold">Present Staff</p>
                        <p id="home-staff-present" class="text-2xl font-bold text-green-600">0</p>
                    </div>
                    <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500">
                        <p class="text-gray-500 text-[10px] uppercase font-bold">Absent Staff</p>
                        <p id="home-staff-absent" class="text-2xl font-bold text-red-600">0</p>
                    </div>
                </div>

                <div class="bg-white p-5 rounded-xl shadow-sm border-t-4 border-blue-500 text-center">
                    <p class="text-gray-500 text-[10px] uppercase font-bold mb-2">Student Attendance Summary</p>
                    <div class="flex items-center justify-center space-x-2 text-xl font-bold">
                        <span id="home-stud-present" class="text-blue-600">0</span>
                        <span class="text-gray-400">+</span>
                        <span id="home-stud-absent" class="text-red-500">0</span>
                        <span class="text-gray-400">=</span>
                        <span id="home-stud-total" class="text-gray-800">0</span>
                    </div>
                    <div class="flex justify-center space-x-8 mt-1 text-[9px] uppercase text-gray-400 font-bold">
                        <span>Present</span>
                        <span>Absent</span>
                        <span>Total</span>
                    </div>
                </div>
             <div onclick="loadSection('students')" class="bg-white p-5 rounded-xl shadow-sm border-t-4 border-blue-500 text-center">
                    <div class="flex items-center space-x-3">
                        <div>
                            <p class="text-gray-500 text-[10px] uppercase font-bold">View records, GR Nos, and Contacts</p>
                            <p class="text-2xl font-bold text-blue-600">Student Details</p>
                        </div>
                    </div>
                </div>  
            </div>
        `;
        updateHomeSummary();
    } else {
        content.innerHTML = `<div class="bg-blue-600 p-6 rounded-2xl text-white shadow-lg"><h2 class="text-2xl font-bold">Hello, ${name}</h2></div>`;
    }
}
    
if (section === 'attendance') {
    const role = localStorage.getItem('userRole');
    const mappedClass = localStorage.getItem('mappedClass');
    const name = localStorage.getItem('userName');
    const now = new Date();
    const day = now.getDay();
    const dateKey = now.toISOString().split('T')[0];
    const isSunday = day === 0;

    // 1. Common Sunday Check
    if (isSunday) {
        content.innerHTML = `<div class="p-10 text-center bg-white rounded-2xl shadow-sm">
            <p class="text-4xl mb-4">🏠</p>
            <p class="font-bold text-lg">Today is Sunday</p>
            <p class="text-gray-500">School is closed.</p>
        </div>`;
        return;
    }

    // 2. Prepare Container
    content.innerHTML = `
        <div class="space-y-6">
            <div id="staff-section" class="${role === 'Student' ? 'hidden' : 'space-y-4'}">
                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider">My Attendance (Staff)</h3>
                <div id="staff-controls"></div> 
            </div>

            <hr class="border-gray-100 ${role === 'Student' ? 'hidden' : ''}">

            <div id="student-section" class="space-y-4">
                <div class="flex justify-between items-center">
                    <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider">Student Attendance</h3>
                    ${role !== 'Student' ? `
                        <button onclick="downloadStudentReport()" class="text-blue-600 text-[10px] font-bold">📥 REPORT</button>
                    ` : ''}
                </div>
                
                <div id="student-interface"></div>
            </div>
        </div>
    `;

    // 3. Logic for Staff Controls (Teachers, Supervisor, Admin)
    if (role !== 'Student') {
        const time = now.getHours() * 100 + now.getMinutes();
        const hasCheckedIn = localStorage.getItem('hasCheckedInToday') === 'true';
        const isTooEarly = time < 710;
        const isShortDay = (day === 5);
        const closingLabel = isShortDay ? "10:45 AM" : "01:00 PM";

        document.getElementById('staff-controls').innerHTML = `
            <div class="bg-gray-100 p-3 rounded-lg text-center text-[10px] font-bold text-gray-600 mb-3">
                Shift: 07:20 AM to ${closingLabel}
            </div>
            <div class="grid grid-cols-2 gap-3">
                <button onclick="markAttendance('IN')" ${hasCheckedIn || isTooEarly ? 'disabled' : ''} 
                    class="p-4 rounded-xl font-bold text-sm ${hasCheckedIn || isTooEarly ? 'bg-gray-200 text-gray-400' : 'bg-green-500 text-white shadow-md'}">
                    ${isTooEarly ? 'Too Early' : (hasCheckedIn ? 'IN ✅' : 'Check IN')}
                </button>
                <button onclick="markAttendance('OUT')" ${!hasCheckedIn ? 'disabled' : ''} 
                    class="p-4 rounded-xl font-bold text-sm ${!hasCheckedIn ? 'bg-gray-200 text-gray-400' : 'bg-red-500 text-white shadow-md'}">
                    Check OUT
                </button>
            </div>
        `;

        // Student Marking Interface for Staff
// Updated Student Marking Interface for both Admin and Teacher
document.getElementById('student-interface').innerHTML = `
    <div class="bg-blue-600 p-4 rounded-2xl text-white shadow-lg">
        <p class="text-[10px] opacity-80 font-bold uppercase">Mark Attendance For:</p>
        <div class="flex gap-2 mt-2">
            <select id="target-class" class="flex-1 bg-blue-700 border-none rounded-lg text-sm p-2 focus:ring-0 text-white" 
                ${role === 'Teacher' ? 'disabled' : ''}>
                
                <option value="${mappedClass}">Class ${mappedClass}</option>
                
                ${role !== 'Teacher' ? `
                    <option value="Jr KG">Class Jr KG</option>
                    <option value="Sr KG">Class Sr KG</option>
                    ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<option value="${n}">Class ${n}th Std</option>`).join('')}
                ` : ''}
            </select>
            
            <button onclick="loadAttendanceSheet()" class="bg-white text-blue-600 px-4 py-2 rounded-lg font-bold text-sm active:scale-95 transition-all">
                Open List
            </button>
        </div>
    </div>
    <div id="attendance-sheet-container" class="mt-4"></div>
`;
    } 
    
    // 4. Logic for Students (View Only)
    else {
        document.getElementById('student-interface').innerHTML = `
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <p class="text-sm font-bold text-gray-700">My Attendance History</p>
                <div id="personal-logs" class="mt-3 space-y-2 text-xs">
                    <p class="text-gray-400 italic">Fetching your records...</p>
                </div>
            </div>
        `;
        fetchPersonalStudentLogs(name);
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


if (section === 'students') {
    content.innerHTML = `
        <div class="space-y-4">
            <div class="bg-white p-4 rounded-2xl shadow-sm sticky top-0 z-10">
                <h2 class="text-lg font-bold mb-3">Student Directory</h2>
                
                <div class="space-y-2">
                    <input type="text" id="studentSearch" onkeyup="filterStudents()" 
                        placeholder="Search by name or ID..." 
                        class="w-full p-3 bg-gray-100 rounded-xl text-sm border-none focus:ring-2 focus:ring-blue-500">
                    
                    <select id="classFilter" onchange="filterStudents()" 
                        class="w-full p-3 bg-gray-100 rounded-xl text-sm border-none">
                        <option value="All">All Classes</option>
                        <option value="Jr KG">Jr KG</option>
                        <option value="Sr KG">Sr KG</option>
                        <option value="1">1st Standard</option>
                        <option value="2">2nd Standard</option>
                        <option value="3">3rd Standard</option>
                        <option value="4">4th Standard</option>
                        <option value="5">5th Standard</option>
                        <option value="6">6th Standard</option>
                        <option value="7">7th Standard</option>
                        <option value="8">8th Standard</option>
                        <option value="9">9th Standard</option>
                        <option value="10">10th Standard</option>
                    </select>
                </div>
            </div>

            <div id="student-list-container" class="space-y-2">
                <p class="text-center py-10 text-gray-400 italic">Loading students...</p>
            </div>
        </div>
    `;
    fetchStudentData();
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

    firebase.database().ref('attendance').once('value', (snapshot) => {
        const allData = snapshot.val();
        if (!allData) return alert("No data found.");

        const report = {}; 

        Object.keys(allData).forEach(dateStr => {
            if (dateStr.startsWith(`${year}-${month.toString().padStart(2, '0')}`)) {
                const day = parseInt(dateStr.split('-')[2]);
                const logs = Object.values(allData[dateStr]);

                logs.forEach(log => {
                    if (!report[log.name]) report[log.name] = { days: {}, totalMinutes: 0 };
                    
                    // Store the raw timestamp for calculation and the formatted time for the CSV
                    report[log.name].days[`${day}_${log.type}`] = log.time;
                    report[log.name].days[`${day}_${log.type}_raw`] = log.timestamp;
                });
            }
        });

        // 1. Create CSV Header
        let csvContent = "data:text/csv;charset=utf-8,Staff Name";
        for (let i = 1; i <= daysInMonth; i++) {
            csvContent += `,${i} IN,${i} OUT`;
        }
        csvContent += ",TOTAL WORKING HOURS\n";

        // 2. Process Rows & Calculate Durations
        Object.keys(report).forEach(staffName => {
            let row = `"${staffName}"`;
            let staffTotalMin = 0;

            for (let i = 1; i <= daysInMonth; i++) {
                const checkInTime = report[staffName].days[`${i}_IN`] || "-";
                const checkOutTime = report[staffName].days[`${i}_OUT`] || "-";
                
                row += `,${checkInTime},${checkOutTime}`;

                // Calculate duration if both IN and OUT exist for the day
                const rawIn = report[staffName].days[`${i}_IN_raw`];
                const rawOut = report[staffName].days[`${i}_OUT_raw`];

                if (rawIn && rawOut && rawOut > rawIn) {
                    const diffMs = rawOut - rawIn;
                    staffTotalMin += Math.floor(diffMs / 60000);
                }
            }

            // Convert total minutes to "X hrs Y mins"
            const finalHrs = Math.floor(staffTotalMin / 60);
            const finalMins = staffTotalMin % 60;
            row += `,"${finalHrs} hrs ${finalMins} mins"`;
            
            csvContent += row + "\n";
        });

        // 3. Download Trigger
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Monthly_Report_${month}_${year}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
};

window.updateHomeSummary = async () => {
    const dateKey = new Date().toISOString().split('T')[0];
    
    // 1. Fetch Total Counts from CSVs
    const staffRes = await fetch(TEACHER_SHEET_CSV);
    const staffText = await staffRes.text();
    const totalStaffCount = staffText.split('\n').filter(r => r.trim()).length - 1;

    const studRes = await fetch(STUDENT_SHEET_CSV);
    const studText = await studRes.text();
    const totalStudentCount = studText.split('\n').filter(r => r.trim()).length - 1;

    // 2. Update Staff Summary (Existing Logic)
    firebase.database().ref('attendance/' + dateKey).on('value', (snapshot) => {
        const data = snapshot.val();
        let presentStaff = 0;
        if (data) {
            const uniqueNames = new Set();
            Object.values(data).forEach(log => {
                if (log.type.includes('IN')) uniqueNames.add(log.name);
            });
            presentStaff = uniqueNames.size;
        }
        document.getElementById('home-staff-present').innerText = presentStaff;
        document.getElementById('home-staff-absent').innerText = Math.max(0, totalStaffCount - presentStaff);
    });

    // 3. NEW: Update Student Summary from student_attendance node
    firebase.database().ref('student_attendance/' + dateKey).on('value', (snapshot) => {
        const classesData = snapshot.val();
        let sPresent = 0;

        if (classesData) {
            // Iterate through each class marked today
            Object.values(classesData).forEach(classObj => {
                if (classObj.records) {
                    // Count students marked 'Present' in this class
                    Object.values(classObj.records).forEach(record => {
                        if (record.status === 'Present') sPresent++;
                    });
                }
            });
        }

        const sAbsent = Math.max(0, totalStudentCount - sPresent);
        document.getElementById('home-stud-present').innerText = sPresent;
        document.getElementById('home-stud-absent').innerText = sAbsent;
        document.getElementById('home-stud-total').innerText = totalStudentCount;
    });
};

let allStudents = []; // Global variable to store the list for filtering

window.fetchStudentData = async () => {
    try {
        const response = await fetch(STUDENT_SHEET_CSV);
        const text = await response.text();
        // Split by lines and remove empty rows
        const rows = text.split('\n').filter(row => row.trim() !== '').slice(1); 

        allStudents = rows.map(row => {
            const cols = row.split(',');
            return {
                id: cols[2]?.trim(),    // GR No (Column C)
                name: cols[7]?.trim(),  // Full Name (Column H)
                class: cols[1]?.trim(), // Class (Column B)
                roll: cols[3]?.trim(),   // Roll No (Column D)
                contact: cols[15]?.trim()  // Contact No (Col N) data is not in column 15 but bcoz its CSV it counts commas of Col M
            };
        });

        renderStudentList(allStudents);
    } catch (error) {
        console.error("Error loading student data:", error);
        document.getElementById('student-list-container').innerHTML = 
            `<p class="text-red-500 text-center">Failed to load student data. Check CSV publishing settings.</p>`;
    }
};

window.renderStudentList = (students) => {
    const container = document.getElementById('student-list-container');
    
    if (students.length === 0) {
        container.innerHTML = `<p class="text-center py-10 text-gray-400">No students found.</p>`;
        return;
    }

    container.innerHTML = students.map(s => `
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-50 flex justify-between items-center">
            <div>
                <p class="font-bold text-gray-800">${s.name}</p>
                <p class="text-xs text-gray-500">GR: ${s.id} • Roll: ${s.roll}</p>
                <p class="text-sm text-blue-600 mt-1 font-medium">
                    📞 ${s.contact || 'No Number'}
                </p>
            </div>
            <div class="text-right">
                <span class="block bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-[10px] font-bold mb-2">
                    Class ${s.class}
                </span>
                ${s.contact ? `
                    <a href="tel:${s.contact}" class="bg-green-500 text-white p-2 rounded-lg text-xs">
                        Call Now
                    </a>
                ` : ''}
            </div>
        </div>
    `).join('');
};

window.filterStudents = () => {
    const term = document.getElementById('studentSearch').value.toLowerCase();
    const filtered = allStudents.filter(s => s.name.toLowerCase().includes(term) || s.id.includes(term));
    renderStudentList(filtered);
};

window.handleLogout = () => {
    if (confirm("Sign out?")) { localStorage.clear(); location.reload(); }
};

window.renderStudentList = (students) => {
    const container = document.getElementById('student-list-container');
    if (students.length === 0) {
        container.innerHTML = `<p class="text-center py-10 text-gray-400">No students found.</p>`;
        return;
    }

    container.innerHTML = students.map(s => `
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-50 flex justify-between items-center">
            <div>
                <p class="font-bold text-gray-800">${s.name}</p>
                <p class="text-xs text-gray-500">GR: ${s.id} • Roll No: ${s.roll} • Phone No: ${s.contact}</p>
            </div>
            <span class="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">
                Class ${s.class}
            </span>
        </div>
    `).join('');
};

window.filterStudents = () => {
    const searchTerm = document.getElementById('studentSearch').value.toLowerCase();
    const classVal = document.getElementById('classFilter').value;

    const filtered = allStudents.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm) || s.id.includes(searchTerm);
        const matchesClass = (classVal === "All" || s.class === classVal);
        return matchesSearch && matchesClass;
    });

    renderStudentList(filtered);
};
    
window.handleLogout = () => {
    if (confirm("Sign out of the system?")) {
        localStorage.clear();
        location.reload();
    }
}

// 7. STUDENT ATTENDANCE MARKING LOGIC
window.loadAttendanceSheet = async () => {
    const classVal = document.getElementById('target-class').value;
    const container = document.getElementById('attendance-sheet-container');
    const dateKey = new Date().toISOString().split('T')[0];
    
    if (!classVal || classVal === "") {
        alert("Please select a class first");
        return;
    }

    container.innerHTML = `<p class="text-center py-5 text-gray-400 italic text-sm">Loading data for Class ${classVal}...</p>`;

    try {
        // 1. Fetch current saved attendance from Firebase
        const snapshot = await firebase.database().ref(`student_attendance/${dateKey}/${classVal}/records`).once('value');
        const existingRecords = snapshot.val() || {};

        // 2. Fetch student list from CSV 
        const response = await fetch(STUDENT_SHEET_CSV);
        const text = await response.text();
        const rows = text.split('\n').filter(row => row.trim() !== '').slice(1);

        const normalize = (val) => val ? val.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim() : "";
        const targetClassNormalized = normalize(classVal);

        const classStudents = rows.map(row => {
            const cols = row.split(',');
            return {
                id: cols[2]?.replace(/^"|"$/g, '').trim(),    // GR No (strips quotes)
                name: cols[7]?.replace(/^"|"$/g, '').trim(),  // Name
                class: cols[1]?.replace(/^"|"$/g, '').trim()  // Class
            };
        }).filter(s => normalize(s.class) === targetClassNormalized);

        if (classStudents.length === 0) {
            container.innerHTML = `<p class="text-center py-5 text-red-500 text-sm">No students found for "${classVal}".<br><span class="text-[10px] text-gray-400">Tip: Check if CSV uses "Jr KG" vs "Jr. KG"</span></p>`;
            return;
        }

        // 3. Render the list
        let html = `
            <div class="bg-white rounded-2xl shadow-inner border border-gray-100 overflow-hidden">
                <div class="p-3 bg-gray-50 border-b flex justify-between items-center">
                    <span class="text-xs font-bold text-gray-500 uppercase">Student Name</span>
                    <span class="text-xs font-bold text-gray-500 uppercase">Present?</span>
                </div>
                <div class="max-h-80 overflow-y-auto">
        `;

        classStudents.forEach((s, index) => {
            const studentKey = (s.id && s.id.trim() !== "") ? s.id : `UNKNOWN_${index}`;
            
            // Check if there is existing data for this student today
            // If no data exists yet, default to 'checked' (Present)
            let isChecked = true; 
            if (existingRecords[studentKey]) {
                isChecked = existingRecords[studentKey].status === 'Present';
            }

            html += `
                <div class="flex justify-between items-center p-4 border-b border-gray-50">
                    <div>
                        <p class="text-sm font-bold text-gray-800">${s.name}</p>
                        <p class="text-[10px] text-gray-400">GR: ${s.id || 'N/A'}</p>
                    </div>
                    <input type="checkbox" ${isChecked ? 'checked' : ''} value="${studentKey}" data-name="${s.name}" 
                        class="attendance-checkbox w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                </div>
            `;
        });

        html += `
                </div>
                <div class="p-4 bg-gray-50">
                    <button onclick="submitStudentAttendance('${classVal}')" 
                        class="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform">
                        Update Attendance
                    </button>
                </div>
            </div>
        `;

        container.innerHTML = html;

    } catch (error) {
        console.error("Error loading attendance sheet:", error);
        container.innerHTML = `<p class="text-red-500 text-sm p-4">Failed to load attendance list.</p>`;
    }
};

window.submitStudentAttendance = (classID) => {
    if (!navigator.onLine) {
        alert("⚠️ No Internet! Please connect to the internet to submit attendance."); // 
        return;
    }

    const dateKey = new Date().toISOString().split('T')[0];
    const checkboxes = document.querySelectorAll('.attendance-checkbox');
    const attendanceData = {};
    const markedBy = localStorage.getItem('userName');

    checkboxes.forEach(cb => {
        attendanceData[cb.value] = {
            name: cb.getAttribute('data-name'),
            status: cb.checked ? 'Present' : 'Absent',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
    });

    // Save to Firebase [cite: 324]
    firebase.database().ref(`student_attendance/${dateKey}/${classID}`).set({
        markedBy: markedBy,
        records: attendanceData
    })
    .then(() => {
        alert(`Attendance for Class ${classID} saved successfully!`);
        document.getElementById('attendance-sheet-container').innerHTML = ''; // Clear sheet
    })
    .catch(err => alert("Error saving: " + err.message));
};

}
