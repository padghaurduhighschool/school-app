

// 1. CONFIGURATION & STATE
const TEACHER_SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTtCtTy2UbnOJv3osixYzktVJK9QSUtJhSeeOmtol-efSarJWEaoNA8s-tppqTkM-jP0ZeBJ0DdGlfl/pub?gid=0&single=true&output=csv";
const STUDENT_SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS7GzBg3WiApNvwB_2QNVFuNmX4RaPmkOawPtP6MR_DZ9JJOzTuNRV2mbY4rlesK0yn5zIHYXPyjDmB/pub?gid=0&single=true&output=csv"; 
const OFFICE_LAT = 19.3709; 
const OFFICE_LON = 73.1757; 

const schoolClasses = [
    "Jr KG", "Sr KG", 
    "1", "2", "3", "4", 
    "5", "6", "7", "8", "9", "10"
];

let deferredPrompt;
let allStudents = [];

// 2. STARTUP LOGIC
window.onload = () => {
    const today = new Date();
    const dateKey = today.toISOString().split('T')[0];
    
    if (localStorage.getItem('lastActivityDate') !== dateKey) {
        localStorage.setItem('hasCheckedInToday', 'false');
        localStorage.setItem('lastActivityDate', dateKey);
    }

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

// 3. PWA INSTALLATION
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('install-button-container');
    if (installBtn) installBtn.classList.remove('hidden');
});

// 4. LOGIN LOGIC
window.handleLogin = async function() {
    const phone = document.getElementById('phone').value.trim();
    const code = document.getElementById('code').value.trim();

    try {
        // Check TEACHER sheet
        const teacherRes = await fetch(TEACHER_SHEET_CSV);
        const teacherText = await teacherRes.text();
        const teacherRows = teacherText.split('\n').map(r => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/));

        let user = teacherRows.find(row => 
            row[0]?.trim() === phone && 
            row[1]?.trim() === code
        );

        if (user) {
            localStorage.setItem('userRole', user[3]?.trim() || 'Teacher');
            localStorage.setItem('userName', user[2]?.trim() || 'Teacher');
            localStorage.setItem('mappedClass', user[5]?.trim() || "");
            localStorage.setItem('userPhone', phone);

            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('main-app').classList.remove('hidden');
            loadSection('home');
            registerForPushNotifications();
            return;
        }

        // Check STUDENT sheet
        const studentRes = await fetch(STUDENT_SHEET_CSV);
        const studentText = await studentRes.text();
        const rows = studentText.split('\n').map(r => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/));
        
        const headers = rows[0].map(h => h.replace(/"/g, '').trim().toLowerCase());
        const grIndex = headers.findIndex(h => h.includes('gr'));
        const nameIndex = headers.findIndex(h => h.includes('name'));
        const classIndex = headers.findIndex(h => h.includes('class'));
        const phoneIndex = headers.findIndex(h => h.includes('contact'));
        const codeIndex = headers.findIndex(h => h.includes('code'));

        let student = null;
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const studentPhone = row[phoneIndex]?.replace(/"/g, '').trim();
            const studentCode = row[codeIndex]?.replace(/"/g, '').trim();
            if (studentPhone === phone && studentCode === code) {
                student = {
                    gr: row[grIndex]?.replace(/"/g, '').trim(),
                    name: row[nameIndex]?.replace(/"/g, '').trim(),
                    class: row[classIndex]?.replace(/"/g, '').trim(),
                    phone: studentPhone,
                    code: studentCode
                };
                break;
            }
        }

        if (student) {
            localStorage.setItem('userRole', 'Student');
            localStorage.setItem('userName', student.name);
            localStorage.setItem('mappedClass', student.class);
            localStorage.setItem('userGR', student.gr);
            localStorage.setItem('userPhone', phone);

            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('main-app').classList.remove('hidden');
            loadSection('home');
            registerForPushNotifications();
            return;
        }

        alert("Invalid credentials. Please check phone or code.");

    } catch (error) {
        console.error(error);
        alert("Login failed. Check internet or CSV access.");
    }
};

// 5. PUSH NOTIFICATION REGISTRATION
async function registerForPushNotifications() {
    if ('Notification' in window && 'serviceWorker' in navigator) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            try {
                const swRegistration = await navigator.serviceWorker.ready;
                // Note: You need VAPID keys for production
                console.log("Push notifications supported");
            } catch (err) {
                console.log("Push error:", err);
            }
        }
    }
}

// 6. DASHBOARD NAVIGATION
window.loadSection = (section) => {
    const content = document.getElementById('content');
    const role = localStorage.getItem('userRole');
    const name = localStorage.getItem('userName');
    document.getElementById('user-role-title').innerHTML = `<i class="fa-solid fa-school mr-2"></i>${role} Dashboard`;
    
    if (section === 'home') {
        if (["Supervisor", "Clerk", "Super Admin", "Admin", "Teacher"].includes(role)) {
            content.innerHTML = `
                <div class="space-y-4">
                    <div class="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-2xl text-white shadow-lg">
                        <h2 class="text-2xl font-bold">Welcome, ${name}</h2>
                        <p class="text-sm opacity-80 mt-1">${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>

                    <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm cursor-pointer active:scale-95 transition-all" onclick="loadSection('staff_logs_detail')">
                        <div class="flex justify-between items-center mb-2">
                            <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Staff Attendance</h3>
                            <span class="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold" id="home-staff-total">0</span>
                        </div>
                        <div class="flex items-end justify-between">
                            <div>
                                <p class="text-2xl font-black text-gray-800" id="home-staff-present">0</p>
                                <p class="text-[10px] text-gray-400 font-bold uppercase">Present Today</p>
                            </div>
                            <div class="text-right">
                                <p class="text-lg font-bold text-red-500" id="home-staff-absent">0</p>
                                <p class="text-[10px] text-gray-400 font-bold uppercase">Absent</p>
                            </div>
                        </div>
                        <div class="mt-3 w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                            <div id="home-staff-bar" class="bg-blue-600 h-full transition-all duration-500" style="width: 0%"></div>
                        </div>
                    </div>

                    <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm cursor-pointer active:scale-95 transition-all" onclick="loadSection('student_attendance_summary')">
                        <div class="flex justify-between items-center mb-2">
                            <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Student Attendance</h3>
                            <span class="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold" id="home-stud-total">0</span>
                        </div>
                        <div class="grid grid-cols-3 gap-2 items-end">
                            <div>
                                <p class="text-xl font-black text-gray-800" id="home-stud-present">0</p>
                                <p class="text-[8px] text-gray-400 font-bold uppercase">Present</p>
                            </div>
                            <div class="text-center">
                                <p class="text-xs font-bold text-red-500" id="home-stud-absent">0</p>
                                <p class="text-[8px] text-gray-400 font-bold uppercase">Absent</p>
                            </div>
                            <div class="text-right">
                                <p class="text-xs font-bold text-orange-500" id="home-stud-unchecked">0</p>
                                <p class="text-[8px] text-gray-400 font-bold uppercase">Unchecked</p>
                            </div>
                        </div>
                        <div class="mt-3 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden flex">
                            <div id="home-stud-bar-present" class="bg-green-500 h-full transition-all duration-500" style="width: 0%"></div>
                            <div id="home-stud-bar-absent" class="bg-red-400 h-full transition-all duration-500" style="width: 0%"></div>
                        </div>
                    </div>

                    <div onclick="openDailyTimeTable()" class="bg-white p-5 rounded-xl shadow-sm border-l-4 border-green-500 cursor-pointer active:scale-95 transition-all">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-[10px] uppercase font-bold">Students View</p>
                                <p class="text-lg font-bold text-green-600">Daily Time Table</p>
                            </div>
                            <i class="fa-regular fa-calendar text-green-400 text-2xl"></i>
                        </div>
                    </div>

                    <div onclick="openExamTimeTable()" class="bg-white p-5 rounded-xl shadow-sm border-l-4 border-orange-500 cursor-pointer active:scale-95 transition-all">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-[10px] uppercase font-bold">Students View</p>
                                <p class="text-lg font-bold text-orange-600">Exam Time Table</p>
                            </div>
                            <i class="fa-regular fa-clock text-orange-400 text-2xl"></i>
                        </div>
                    </div>

                    <div onclick="openTeacherTimeTable()" class="bg-white p-5 rounded-xl shadow-sm border-l-4 border-purple-500 cursor-pointer active:scale-95 transition-all">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-[10px] uppercase font-bold">Teachers View</p>
                                <p class="text-lg font-bold text-purple-600">Teacher Time Table</p>
                            </div>
                            <i class="fa-regular fa-user text-purple-400 text-2xl"></i>
                        </div>
                    </div>

                    <div onclick="loadSection('students')" class="bg-white p-5 rounded-xl shadow-sm border-l-4 border-blue-500 cursor-pointer active:scale-95 transition-all">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-[10px] uppercase font-bold">View records</p>
                                <p class="text-lg font-bold text-blue-600">Student Details</p>
                            </div>
                            <i class="fa-regular fa-address-card text-blue-400 text-2xl"></i>
                        </div>
                    </div>

                    <div onclick="showFeesDashboard()" class="bg-white p-5 rounded-xl shadow-sm border-l-4 border-emerald-500 cursor-pointer active:scale-95 transition-all">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-[10px] uppercase font-bold">Accounts</p>
                                <p class="text-lg font-bold text-emerald-600">Fees Dashboard</p>
                            </div>
                            <i class="fa-regular fa-credit-card text-emerald-400 text-2xl"></i>
                        </div>
                    </div>
                </div>
            `;
updateHomeSummary().catch(console.error);
        } else if (role === 'Student') {
            content.innerHTML = `
                <div class="space-y-4">
                    <div class="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-2xl text-white shadow-lg">
                        <h2 class="text-2xl font-bold">Hello, ${name}</h2>
                        <p class="text-sm opacity-80 mt-1">Welcome to your Dashboard</p>
                    </div>

                    <div onclick="openDailyTimeTable()" class="bg-white p-5 rounded-xl shadow-sm border-l-4 border-green-500 cursor-pointer active:scale-95 transition-all">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-[10px] uppercase font-bold">Schedule</p>
                                <p class="text-lg font-bold text-green-600">Daily Time Table</p>
                                <p class="text-xs text-gray-400 mt-1">Class: ${localStorage.getItem('mappedClass')}</p>
                            </div>
                            <i class="fa-regular fa-calendar text-green-400 text-2xl"></i>
                        </div>
                    </div>

                    <div onclick="openExamTimeTable()" class="bg-white p-5 rounded-xl shadow-sm border-l-4 border-orange-500 cursor-pointer active:scale-95 transition-all">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-[10px] uppercase font-bold">Assessments</p>
                                <p class="text-lg font-bold text-orange-600">Exam Time Table</p>
                            </div>
                            <i class="fa-regular fa-clock text-orange-400 text-2xl"></i>
                        </div>
                    </div>
                </div>
            `;
        }
    } 
    else if (section === 'attendance') {
        loadAttendanceSection();
    }
    else if (section === 'homework') {
        loadHomeworkSection();
    }
    else if (section === 'notices') {
        loadNoticesSection();
    }
else if (section === 'more') {
    const role = localStorage.getItem('userRole');
    const name = localStorage.getItem('userName');
    const phone = localStorage.getItem('userPhone');
    
    content.innerHTML = `
        <div class="space-y-4">
            <!-- Profile Card -->
            <div class="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
                <div class="flex items-center space-x-4">
                    <div class="bg-white/20 rounded-full p-3">
                        <i class="fas fa-user-circle text-4xl"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-xl">${escapeHtml(name)}</h3>
                        <p class="text-white/80 text-sm">${escapeHtml(role)}</p>
                        <p class="text-white/60 text-xs mt-1"><i class="fas fa-phone mr-1"></i>${escapeHtml(phone) || 'Not provided'}</p>
                    </div>
                </div>
            </div>
            
            <!-- Settings Section -->
            <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div class="p-4 border-b">
                    <h3 class="font-bold text-gray-800"><i class="fas fa-cog mr-2 text-indigo-600"></i>Settings</h3>
                </div>
                
                <div class="p-4 space-y-3">
                    <!-- Push Notification Toggle Button -->
                    <button id="enable-notifications-btn" onclick="togglePushNotifications()" 
                        class="flex flex-col items-center p-4 bg-blue-50 border border-blue-100 rounded-2xl shadow-sm active:scale-95 transition-all w-full">
                        <div class="flex items-center justify-center w-full">
                            <i class="fas fa-bell mr-2 text-blue-600"></i>
                            <span class="text-sm font-bold text-blue-700">Checking notification status...</span>
                        </div>
                    </button>
                    
                    <!-- Install App Button -->
                    <div id="install-button-container" class="${deferredPrompt ? '' : 'hidden'}">
                        <button onclick="triggerInstall()" 
                            class="flex flex-col items-center p-4 bg-green-50 border border-green-100 rounded-2xl shadow-sm active:scale-95 transition-all w-full">
                            <div class="flex items-center justify-center w-full">
                                <i class="fas fa-download mr-2 text-green-600"></i>
                                <span class="text-sm font-bold text-green-700">Install App on Device</span>
                            </div>
                            <p class="text-xs text-gray-500 mt-2">Add to home screen for quick access</p>
                        </button>
                    </div>
                    
                    <!-- Fees Chart Button -->
                    <button onclick="showFeesChart()" 
                        class="flex flex-col items-center p-4 bg-purple-50 border border-purple-100 rounded-2xl shadow-sm active:scale-95 transition-all w-full">
                        <div class="flex items-center justify-center w-full">
                            <i class="fas fa-chart-line mr-2 text-purple-600"></i>
                            <span class="text-sm font-bold text-purple-700">View Fees Chart</span>
                        </div>
                        <p class="text-xs text-gray-500 mt-2">Financial overview</p>
                    </button>
                    
                    <!-- Monthly Hours (for staff only) -->
                    ${role !== 'Student' ? `
                        <button onclick="calculateMonthlyHours()" 
                            class="flex flex-col items-center p-4 bg-orange-50 border border-orange-100 rounded-2xl shadow-sm active:scale-95 transition-all w-full">
                            <div class="flex items-center justify-center w-full">
                                <i class="fas fa-clock mr-2 text-orange-600"></i>
                                <span class="text-sm font-bold text-orange-700">Monthly Working Hours</span>
                            </div>
                            <p class="text-xs text-gray-500 mt-2">Track your attendance hours</p>
                        </button>
                    ` : ''}
                    
                    <!-- Logout Button -->
                    <button onclick="handleLogout()" 
                        class="flex flex-col items-center p-4 bg-red-50 border border-red-100 rounded-2xl shadow-sm active:scale-95 transition-all w-full">
                        <div class="flex items-center justify-center w-full">
                            <i class="fas fa-sign-out-alt mr-2 text-red-600"></i>
                            <span class="text-sm font-bold text-red-700">Logout</span>
                        </div>
                        <p class="text-xs text-gray-500 mt-2">Sign out of your account</p>
                    </button>
                </div>
            </div>
            
            <!-- App Info -->
            <div class="text-center text-xs text-gray-400 py-4">
                <p>Version 2.0.0 | Padgha Urdu High School</p>
                <p class="mt-1">© 2024 All rights reserved</p>
            </div>
        </div>
    `;
    
    // Initialize notification button state
    setTimeout(() => {
        checkNotificationStatus();
    }, 100);
}



   else if (section === 'students') {
        loadStudentsSection();
    }
    else if (section === 'staff_logs_detail') {
        loadStaffLogsDetail();
    }
    else if (section === 'student_attendance_summary') {
        loadClassAttendanceStatus();
    }
};

// 7. ATTENDANCE SECTION
function loadAttendanceSection() {
    const content = document.getElementById('content');
    const role = localStorage.getItem('userRole');
    const mappedClass = localStorage.getItem('mappedClass') || "";
    const now = new Date();
    const day = now.getDay();
    const isSunday = day === 0;

    if (isSunday) {
        content.innerHTML = `
            <div class="p-10 text-center bg-white rounded-2xl shadow-sm">
                <i class="fa-solid fa-bed text-5xl text-gray-300 mb-4"></i>
                <p class="font-bold text-lg">Today is Sunday</p>
                <p class="text-gray-500">School is closed.</p>
            </div>`;
        return;
    }

    const isStaff = ['Admin', 'Super Admin', 'Supervisor', 'Clerk', 'Teacher'].includes(role);

    content.innerHTML = `
        <div class="space-y-4">
            <div id="staff-section" class="${!isStaff ? 'hidden' : 'space-y-4'}">
                <div class="bg-gradient-to-r from-blue-600 to-blue-700 p-5 rounded-2xl text-white">
                    <h3 class="text-sm font-bold opacity-90">My Attendance</h3>
                    <div id="staff-controls" class="mt-3"></div>
                </div>
                <div id="attendance-feedback" class="text-center text-xs"></div>
            </div>

            <div id="student-section" class="space-y-4">
                <div class="flex justify-between items-center">
                    <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        ${isStaff ? 'Mark Student Attendance' : 'My Attendance History'}
                    </h3>
                    ${isStaff ? `
                        <button onclick="downloadStudentReport()" class="text-blue-600 text-xs font-bold bg-blue-50 px-3 py-1 rounded-full">
                            <i class="fa-solid fa-download mr-1"></i>REPORT
                        </button>
                    ` : ''}
                </div>
                <div id="student-interface"></div>
            </div>
        </div>
    `;

    if (isStaff) {
        const time = now.getHours() * 100 + now.getMinutes();
        const hasCheckedIn = localStorage.getItem('hasCheckedInToday') === 'true';
        const isTooEarly = time < 710;
        
        document.getElementById('staff-controls').innerHTML = `
            <div class="grid grid-cols-2 gap-3">
                <button onclick="markAttendance('IN')" ${hasCheckedIn || isTooEarly ? 'disabled' : ''} 
                    class="p-4 rounded-xl font-bold text-sm ${hasCheckedIn || isTooEarly ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'} text-white transition-all">
                    <i class="fa-solid fa-sign-in-alt mr-2"></i>${isTooEarly ? 'Too Early' : (hasCheckedIn ? 'Checked IN ✅' : 'Check IN')}
                </button>
                <button onclick="markAttendance('OUT')" ${!hasCheckedIn ? 'disabled' : ''} 
                    class="p-4 rounded-xl font-bold text-sm ${!hasCheckedIn ? 'bg-gray-500 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'} text-white transition-all">
                    <i class="fa-solid fa-sign-out-alt mr-2"></i>Check OUT
                </button>
            </div>
        `;

        document.getElementById('student-interface').innerHTML = `
            <div class="bg-blue-50 p-4 rounded-2xl">
                <p class="text-xs font-bold text-blue-800 uppercase mb-2">Mark Attendance For:</p>
                <div class="flex gap-2">
                    <select id="target-class" class="flex-1 p-3 bg-white border border-blue-200 rounded-xl text-sm">
                        <option value="${mappedClass}">Class ${mappedClass || 'Select'}</option>
                        ${role !== 'Teacher' ? schoolClasses.map(c => `<option value="${c}">${c}</option>`).join('') : ''}
                    </select>
                    <button onclick="loadAttendanceSheet()" class="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm">
                        <i class="fa-solid fa-list mr-1"></i>Open
                    </button>
                </div>
            </div>
            <div id="attendance-sheet-container" class="mt-4"></div>
        `;
    } else {
        document.getElementById('student-interface').innerHTML = `
            <div class="bg-white p-4 rounded-xl shadow-sm">
                <div id="personal-logs" class="space-y-2 text-xs">
                    <p class="text-gray-400 italic">Fetching your records...</p>
                </div>
            </div>
        `;
        fetchPersonalStudentLogs(localStorage.getItem('userName'));
    }
}

// 8. MARK ATTENDANCE WITH GEOLOCATION
window.markAttendance = async (type) => {
    const now = new Date();
    const timeNum = now.getHours() * 100 + now.getMinutes();
    let statusPrefix = "";
    
    if (type === 'IN' && timeNum > 720) {
        statusPrefix = "[LATE] ";
    }

    if (!navigator.geolocation) {
        alert("Geolocation not supported");
        return;
    }

    navigator.geolocation.getCurrentPosition((position) => {
        const distance = calculateDistance(position.coords.latitude, position.coords.longitude, OFFICE_LAT, OFFICE_LON);
        const msg = `You are ${Math.round(distance)}m from the office.`;
        
        const proceed = (distance > 10) ? confirm(msg + "\n\nYou are outside the 10m range. Mark anyway?") : true;

        if (proceed) {
            saveToDatabase(statusPrefix + type, distance);
            
            if (type === 'IN') {
                localStorage.setItem('hasCheckedInToday', 'true');
                showNotification("Attendance", `Checked IN at ${Math.round(distance)}m from office`);
            } else {
                localStorage.setItem('hasCheckedInToday', 'false');
                alert("Check OUT successful!");
                location.reload();
            }
        }
    }, () => {
        alert("Location Access Denied. Please enable GPS.");
    }, { enableHighAccuracy: true });
};

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2)**2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

function saveToDatabase(type, dist) {
    const name = localStorage.getItem('userName');
    const role = localStorage.getItem('userRole');
    const dateKey = new Date().toISOString().split('T')[0];

    firebase.database().ref('attendance/' + dateKey).push({
        name: name,
        role: role,
        type: type,
        distance: Math.round(dist) + "m",
        time: new Date().toLocaleTimeString(),
        timestamp: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        if (type.includes('IN')) localStorage.setItem('hasCheckedInToday', 'true');
        loadSection('attendance');
    }).catch((error) => {
        alert("Database Error: " + error.message);
    });
}

function showNotification(title, body) {
    if (Notification.permission === 'granted') {
        new Notification(title, { body: body, icon: '/Padgha Urdu High School Logo.png' });
    }
}

// 9. HOMEWORK SECTION
function loadHomeworkSection() {
    const role = localStorage.getItem('userRole');
    const mappedClass = localStorage.getItem('mappedClass');
    const content = document.getElementById('content');
    
    content.innerHTML = `
        <div class="space-y-4">
            <h2 class="text-lg font-bold text-gray-800"><i class="fa-solid fa-book-open mr-2 text-blue-600"></i>Class Homework</h2>
            
            ${["Teacher", "Admin", "Super Admin", "Supervisor", "Clerk"].includes(role) ? `
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-blue-50">
                    <p class="text-xs font-bold text-blue-600 uppercase mb-3"><i class="fa-solid fa-plus mr-1"></i>Post New Homework</p>
                    <div class="space-y-3">
                        <select id="hw-target-class" class="w-full p-3 bg-gray-50 rounded-xl text-sm border focus:ring-2 focus:ring-blue-500">
                            <option value="${mappedClass}">My Class (${mappedClass})</option>
                            ${schoolClasses.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                        <input type="text" id="hw-subject" placeholder="Subject (e.g. Maths)" class="w-full p-3 bg-gray-50 rounded-xl text-sm border focus:ring-2 focus:ring-blue-500">
                        <textarea id="hw-desc" placeholder="Enter homework details..." class="w-full p-3 bg-gray-50 rounded-xl text-sm border focus:ring-2 focus:ring-blue-500 h-24"></textarea>
                        <button onclick="postHomework()" class="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-md active:scale-95 transition-all">
                            <i class="fa-solid fa-paper-plane mr-2"></i>Post Homework
                        </button>
                    </div>
                </div>
            ` : ''}

            <div id="homework-list" class="space-y-3 pb-10">
                <p class="text-center py-10 text-gray-400 italic text-sm">Loading homework...</p>
            </div>
        </div>
    `;
    fetchHomework();
}

window.postHomework = () => {
    const targetClass = document.getElementById('hw-target-class').value;
    const subject = document.getElementById('hw-subject').value;
    const desc = document.getElementById('hw-desc').value;
    const sender = localStorage.getItem('userName');

    if (!subject || !desc) return alert("Please fill in Subject and Details");

    firebase.database().ref('homework').push({
        class: targetClass,
        subject: subject,
        description: desc,
        sender: sender,
        date: new Date().toLocaleDateString('en-GB'),
        timestamp: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        alert("Homework posted successfully!");
        document.getElementById('hw-subject').value = '';
        document.getElementById('hw-desc').value = '';
        fetchHomework();
    });
};

function fetchHomework() {
    const role = localStorage.getItem('userRole');
    const userClass = localStorage.getItem('mappedClass');
    const container = document.getElementById('homework-list');

    firebase.database().ref('homework').orderByChild('timestamp').on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            container.innerHTML = `<p class="text-center py-10 text-gray-400">No homework posted yet.</p>`;
            return;
        }

        const hwArray = Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse();

        container.innerHTML = hwArray.map(hw => {
            if (role === 'Student' && hw.class !== userClass) return '';
            const canDelete = ["Super Admin", "Admin", "Supervisor", "Clerk"].includes(role);

            return `
                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative">
                    <div class="flex justify-between items-start mb-2">
                        <span class="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                            ${hw.subject}
                        </span>
                        <span class="text-[10px] text-gray-400">${hw.date}</span>
                    </div>
                    <h3 class="font-bold text-gray-800">Class ${hw.class}</h3>
                    <p class="text-sm text-gray-600 mt-2">${hw.description}</p>
                    <p class="text-[9px] text-gray-400 mt-4 pt-2 border-t">Posted by ${hw.sender}</p>
                    ${canDelete ? `<button onclick="deleteHomework('${hw.id}')" class="absolute top-4 right-4 text-red-400 text-xs"><i class="fa-solid fa-trash"></i></button>` : ''}
                </div>
            `;
        }).join('');
    });
}

window.deleteHomework = (id) => {
    if (confirm("Delete this homework?")) {
        firebase.database().ref(`homework/${id}`).remove();
    }
};

// 10. NOTICES SECTION
function loadNoticesSection() {
    const role = localStorage.getItem('userRole');
    const content = document.getElementById('content');
    
    content.innerHTML = `
        <div class="space-y-4">
            <h2 class="text-lg font-bold text-gray-800"><i class="fa-solid fa-bell mr-2 text-orange-600"></i>School Notices</h2>
            
            ${["Admin", "Super Admin", "Supervisor", "Clerk"].includes(role) ? `
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-orange-50">
                    <p class="text-xs font-bold text-orange-600 uppercase mb-3"><i class="fa-solid fa-plus mr-1"></i>Send Official Notice</p>
                    <div class="space-y-3">
                        <select id="notice-target-type" onchange="toggleNoticeFields()" class="w-full p-3 bg-gray-50 rounded-xl text-sm">
                            <option value="school">Whole School</option>
                            <option value="class">Specific Class</option>
                            <option value="student">Specific Student</option>
                        </select>
                        <div id="notice-target-details"></div>
                        <input type="text" id="notice-title" placeholder="Notice Title" class="w-full p-3 bg-gray-50 rounded-xl text-sm">
                        <textarea id="notice-body-en" placeholder="English Notice..." class="w-full p-3 bg-gray-50 rounded-xl text-sm h-20"></textarea>
                        <textarea id="notice-body-mr" placeholder="मराठी सूचना..." class="w-full p-3 bg-gray-50 rounded-xl text-sm h-20"></textarea>
                        <textarea id="notice-body-ur" placeholder="اردو نوٹس..." class="w-full p-3 bg-gray-50 rounded-xl text-sm h-20" style="font-family: 'Noto Nastaliq Urdu'"></textarea>
                        <button onclick="postNotice()" class="w-full bg-orange-500 text-white py-3 rounded-xl font-bold shadow-md active:scale-95 transition-all">
                            <i class="fa-solid fa-paper-plane mr-2"></i>Send Notice
                        </button>
                    </div>
                </div>
            ` : ''}

            <div id="notices-list" class="space-y-3 pb-10">
                <p class="text-center py-10 text-gray-400 italic text-sm">Loading notices...</p>
            </div>
        </div>
    `;
    fetchNotices();
}

function toggleNoticeFields() {
    const type = document.getElementById('notice-target-type').value;
    const container = document.getElementById('notice-target-details');
    
    if (type === 'class') {
        container.innerHTML = `<select id="notice-target-value" class="w-full p-3 bg-gray-50 rounded-xl text-sm mt-2">${schoolClasses.map(c => `<option value="${c}">${c}</option>`).join('')}</select>`;
    } else if (type === 'student') {
        container.innerHTML = `
            <div class="mt-2">
                <input type="text" id="studentSearch" oninput="searchStudentNotice()" placeholder="Search student..." class="w-full p-3 bg-gray-50 rounded-xl text-sm">
                <div id="suggestionsBox" class="bg-white border rounded-xl mt-1 max-h-40 overflow-y-auto hidden"></div>
                <input type="hidden" id="notice-target-value">
            </div>
        `;
    } else {
        container.innerHTML = '';
    }
}

window.searchStudentNotice = () => {
    const input = document.getElementById("studentSearch");
    const box = document.getElementById("suggestionsBox");
    if (!input || !box) return;
    const value = input.value.toLowerCase();
    
    if (!value) {
        box.classList.add("hidden");
        return;
    }
    
    const filtered = allStudents.filter(s => s.name.toLowerCase().includes(value) || s.id.includes(value)).slice(0, 10);
    
    if (filtered.length === 0) {
        box.innerHTML = `<div class="p-2 text-gray-400 text-xs">No student found</div>`;
        box.classList.remove("hidden");
        return;
    }
    
    box.innerHTML = filtered.map(s => `
        <div onclick="selectStudent('${s.id}', '${s.name}')" class="p-2 hover:bg-blue-50 cursor-pointer text-sm border-b">
            <b>${s.name}</b><br><span class="text-xs text-gray-500">GR: ${s.id} • Class: ${s.class}</span>
        </div>
    `).join('');
    box.classList.remove("hidden");
};

window.selectStudent = (grNo, name) => {
    document.getElementById("studentSearch").value = name;
    document.getElementById("notice-target-value").value = grNo;
    document.getElementById("suggestionsBox").classList.add("hidden");
};

window.postNotice = () => {
    const type = document.getElementById('notice-target-type').value;
    const targetValue = document.getElementById('notice-target-value')?.value || 'ALL';
    const title = document.getElementById('notice-title').value;
    const bodyEN = document.getElementById('notice-body-en')?.value || "";
    const bodyMR = document.getElementById('notice-body-mr')?.value || "";
    const bodyUR = document.getElementById('notice-body-ur')?.value || "";

    if (!title || (!bodyEN && !bodyMR && !bodyUR)) {
        return alert("Please enter at least one language message");
    }

    firebase.database().ref('notices').push({
        targetType: type,
        targetValue: targetValue,
        title: title,
        message: { en: bodyEN, mr: bodyMR, ur: bodyUR },
        sender: localStorage.getItem('userName'),
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        date: new Date().toLocaleDateString('en-GB')
    }).then(() => {
        alert("Notice sent!");
        loadSection('notices');
    });
};

function fetchNotices() {
    const role = localStorage.getItem('userRole');
    const userClass = localStorage.getItem('mappedClass');
    const userGR = localStorage.getItem('userGR');
    const container = document.getElementById('notices-list');

    firebase.database().ref('notices').orderByChild('timestamp').on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            container.innerHTML = `<p class="text-center py-10 text-gray-400">No active notices.</p>`;
            return;
        }

        const notices = Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse();

        container.innerHTML = notices.map(n => {
            let visible = false;
            if (["Admin", "Super Admin", "Supervisor", "Clerk"].includes(role)) {
                visible = true;
            } else {
                if (n.targetType === 'school') visible = true;
                if (n.targetType === 'class' && n.targetValue === userClass) visible = true;
                if (n.targetType === 'student' && n.targetValue === userGR) visible = true;
            }
            if (!visible) return '';

            return `
                <div class="bg-white p-5 rounded-2xl border-l-4 border-orange-500 shadow-sm">
                    <div class="flex justify-between items-start mb-1">
                        <span class="text-[9px] font-black text-orange-600 uppercase">📢 ${n.targetType === 'school' ? 'Public' : n.targetValue}</span>
                        <span class="text-[10px] text-gray-400">${n.date}</span>
                    </div>
                    <h3 class="font-black text-gray-800 text-sm">${n.title}</h3>
                    <div class="mt-2">
                        <div class="flex gap-2 mb-2 text-[10px]">
                            <button onclick="switchLangNotice('${n.id}','en')" class="lang-tab px-2 py-1 rounded bg-gray-100">EN</button>
                            <button onclick="switchLangNotice('${n.id}','mr')" class="lang-tab px-2 py-1 rounded bg-gray-100">MR</button>
                            <button onclick="switchLangNotice('${n.id}','ur')" class="lang-tab px-2 py-1 rounded bg-gray-100">UR</button>
                        </div>
                        <p id="msg-${n.id}" class="text-xs text-gray-600 leading-relaxed lang-en">${n.message?.en || "No content"}</p>
                    </div>
                    <p class="text-[8px] text-gray-400 mt-3">Authored by: ${n.sender}</p>
                </div>
            `;
        }).join('');
    });
}

window.switchLangNotice = (id, lang) => {
    firebase.database().ref('notices/' + id).once('value', (snapshot) => {
        const n = snapshot.val();
        const msgDiv = document.getElementById(`msg-${id}`);
        if (msgDiv) {
            msgDiv.innerText = n.message?.[lang] || n.message?.en || "No content";
            msgDiv.className = `text-xs text-gray-600 leading-relaxed lang-${lang}`;
        }
    });
};

// 11. STUDENTS SECTION
function loadStudentsSection() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="space-y-4">
            <div class="bg-white p-4 rounded-2xl shadow-sm sticky top-0">
                <h2 class="text-lg font-bold mb-3">Student Directory</h2>
                <div class="space-y-2">
                    <input type="text" id="studentSearch" onkeyup="filterStudents()" placeholder="Search by name or GR..." class="w-full p-3 bg-gray-50 rounded-xl text-sm">
                    <select id="classFilter" onchange="filterStudents()" class="w-full p-3 bg-gray-50 rounded-xl text-sm">
                        <option value="All">All Classes</option>
                        ${schoolClasses.map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div id="student-list-container" class="space-y-2"><p class="text-center py-10 text-gray-400">Loading students...</p></div>
        </div>
    `;
    fetchStudentData();
}

async function fetchStudentData() {
    try {
        const response = await fetch(STUDENT_SHEET_CSV);
        const text = await response.text();
        const rows = text.split('\n').filter(row => row.trim() !== '').slice(1);
        
        allStudents = rows.map(row => {
            const cols = row.split(',');
            return {
                id: cols[2]?.replace(/"/g, '').trim(),
                name: cols[7]?.replace(/"/g, '').trim(),
                class: cols[1]?.replace(/"/g, '').trim(),
                roll: cols[3]?.replace(/"/g, '').trim(),
                contact: cols[15]?.replace(/"/g, '').trim()
            };
        }).filter(s => s.name);

        renderStudentList(allStudents);
    } catch (error) {
        console.error(error);
        document.getElementById('student-list-container').innerHTML = `<p class="text-red-500 text-center">Failed to load student data.</p>`;
    }
}

function renderStudentList(students) {
    const container = document.getElementById('student-list-container');
    if (!container) return;
    if (students.length === 0) {
        container.innerHTML = `<p class="text-center py-10 text-gray-400">No students found.</p>`;
        return;
    }
    container.innerHTML = students.map(s => `
        <div class="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center">
            <div>
                <p class="font-bold text-gray-800">${s.name}</p>
                <p class="text-xs text-gray-500">GR: ${s.id} • Roll: ${s.roll}</p>
                <p class="text-xs text-blue-600 mt-1"><i class="fa-solid fa-phone mr-1"></i>${s.contact || 'No Number'}</p>
            </div>
            <div class="text-right">
                <span class="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">Class ${s.class}</span>
                ${s.contact ? `<a href="tel:${s.contact}" class="block mt-2 bg-green-500 text-white p-2 rounded-lg text-xs text-center"><i class="fa-solid fa-phone mr-1"></i>Call</a>` : ''}
            </div>
        </div>
    `).join('');
}

window.filterStudents = () => {
    const term = document.getElementById('studentSearch').value.toLowerCase();
    const classVal = document.getElementById('classFilter').value;
    const filtered = allStudents.filter(s => 
        (s.name.toLowerCase().includes(term) || s.id.includes(term)) && 
        (classVal === "All" || s.class === classVal)
    );
    renderStudentList(filtered);
};

// 12. ATTENDANCE SHEET LOADING - Properly reflects saved data
window.loadAttendanceSheet = async () => {
    const classVal = document.getElementById('target-class').value;
    const container = document.getElementById('attendance-sheet-container');
    const dateKey = new Date().toISOString().split('T')[0];
    
    if (!classVal) {
        alert("Please select a class first");
        return;
    }

    container.innerHTML = `<div class="text-center py-8"><i class="fa-solid fa-spinner fa-spin text-2xl text-gray-400"></i><p class="text-gray-400 text-sm mt-2">Loading students...</p></div>`;

    try {
        // Step 1: Fetch existing attendance records for this class and date
        const attendanceRef = firebase.database().ref(`student_attendance/${dateKey}/${classVal}`);
        const snapshot = await attendanceRef.once('value');
        const existingData = snapshot.val();
        const existingRecords = existingData?.records || {};
        
        console.log("Existing attendance records:", existingRecords);
        console.log("Date:", dateKey, "Class:", classVal);

        // Step 2: Fetch students from CSV
        const response = await fetch(STUDENT_SHEET_CSV);
        const text = await response.text();
        const rows = text.split('\n').filter(row => row.trim()).slice(1);
        
        // Step 3: Get students for this class
        const classStudents = [];
        for (const row of rows) {
            const cols = row.split(',');
            const grNo = cols[2]?.replace(/"/g, '').trim();
            const name = cols[7]?.replace(/"/g, '').trim();
            const studentClass = cols[1]?.replace(/"/g, '').trim();
            const rollNo = cols[3]?.replace(/"/g, '').trim();
            
            if (studentClass === classVal && name) {
                classStudents.push({
                    id: grNo || `temp_${name.replace(/\s/g, '_')}`,
                    grNo: grNo || 'Pending',
                    name: name,
                    rollNo: rollNo
                });
            }
        }
        
        // Sort students
        classStudents.sort((a, b) => {
            if (a.rollNo && b.rollNo) return parseInt(a.rollNo) - parseInt(b.rollNo);
            return a.name.localeCompare(b.name);
        });

        if (classStudents.length === 0) {
            container.innerHTML = `<p class="text-center py-5 text-red-500">No students found for "${classVal}".</p>`;
            return;
        }

        // Step 4: Build the HTML with saved attendance data
        let html = `<div class="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div class="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-white">
                <div class="flex justify-between items-center">
                    <div>
                        <p class="text-xs opacity-80">Attendance for</p>
                        <p class="font-bold text-lg">Class ${classVal}</p>
                        <p class="text-[10px] opacity-70">${new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    ${existingData?.markedBy ? `<div class="text-right text-[10px] opacity-70">Last marked by:<br>${existingData.markedBy}</div>` : ''}
                </div>
            </div>
            <div class="max-h-96 overflow-y-auto">`;
        
        let presentCount = 0;
        let totalCount = classStudents.length;
        
        classStudents.forEach((student) => {
            // Determine the key used to store this student's attendance
            let studentKey = student.grNo !== 'Pending' ? student.grNo : student.name;
            
            // Also check if attendance was saved under a different key (e.g., temp ID)
            let isPresent = false;
            let savedStatus = null;
            
            // Check by primary key (GR or name)
            if (existingRecords[studentKey]?.status === 'Present') {
                isPresent = true;
                savedStatus = existingRecords[studentKey];
            }
            // Check by GR if available
            else if (student.grNo !== 'Pending' && existingRecords[student.grNo]?.status === 'Present') {
                isPresent = true;
                savedStatus = existingRecords[student.grNo];
                studentKey = student.grNo;
            }
            // Check by name
            else if (existingRecords[student.name]?.status === 'Present') {
                isPresent = true;
                savedStatus = existingRecords[student.name];
                studentKey = student.name;
            }
            // Check by temp ID
            else if (existingRecords[student.id]?.status === 'Present') {
                isPresent = true;
                savedStatus = existingRecords[student.id];
                studentKey = student.id;
            }
            
            if (isPresent) presentCount++;
            
            const isPendingGR = student.grNo === 'Pending';
            
            html += `
                <div class="flex justify-between items-center p-4 border-b hover:bg-gray-50 transition-colors">
                    <div class="flex-1">
                        <div class="flex items-center gap-2">
                            <p class="text-sm font-bold text-gray-800">${escapeHtml(student.name)}</p>
                            ${isPendingGR ? '<span class="bg-orange-100 text-orange-600 text-[9px] px-1.5 py-0.5 rounded-full">GR Pending</span>' : ''}
                        </div>
                        <div class="flex gap-3 text-[10px] text-gray-400 mt-0.5">
                            ${student.grNo !== 'Pending' ? `<span>GR: ${student.grNo}</span>` : '<span>📄 Documentation pending</span>'}
                            ${student.rollNo ? `<span>Roll: ${student.rollNo}</span>` : ''}
                            ${savedStatus ? `<span class="text-blue-500">✓ Marked by: ${savedStatus.markedBy || existingData?.markedBy || 'Teacher'}</span>` : ''}
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-xs font-medium ${isPresent ? 'text-green-600' : 'text-gray-400'}">
                            ${isPresent ? 'Present' : 'Absent'}
                        </span>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" 
                                   ${isPresent ? 'checked' : ''} 
                                   data-student-key="${studentKey}"
                                   data-student-name="${student.name}"
                                   data-gr-no="${student.grNo}"
                                   class="attendance-checkbox sr-only peer">
                            <div class="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                    </div>
                </div>
            `;
        });
        
        const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
        
        html += `</div>
            <div class="p-4 bg-gray-50 border-t">
                <div class="flex justify-between items-center mb-3 pb-2 border-b">
                    <div>
                        <span class="text-xs text-gray-500">Attendance Summary</span>
                        <p class="text-sm font-bold"><span class="text-green-600">${presentCount}</span> / <span class="text-gray-600">${totalCount}</span> Present</p>
                    </div>
                    <div class="w-32">
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div class="bg-green-500 h-2 rounded-full" style="width: ${percentage}%"></div>
                        </div>
                        <p class="text-[10px] text-gray-400 text-center mt-1">${percentage}%</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="markAllPresent()" class="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-sm font-bold transition-all">
                        ✓ Mark All Present
                    </button>
                    <button onclick="markAllAbsent()" class="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-bold transition-all">
                        ✗ Mark All Absent
                    </button>
                    <button onclick="submitStudentAttendance('${classVal}')" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-bold transition-all shadow-md">
                        💾 Save Changes
                    </button>
                </div>
            </div>
        </div>`;
        
        container.innerHTML = html;
        
        // Show feedback if attendance was already marked
        if (existingData?.markedBy) {
            const feedbackDiv = document.getElementById('attendance-feedback');
            if (feedbackDiv) {
                feedbackDiv.innerHTML = `<div class="bg-green-50 text-green-600 p-2 rounded-lg text-xs mt-2">
                    <i class="fa-solid fa-check-circle mr-1"></i> Attendance already marked by ${existingData.markedBy}. You can update it below.
                </div>`;
                setTimeout(() => {
                    if (feedbackDiv) feedbackDiv.innerHTML = '';
                }, 5000);
            }
        }
        
    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="text-center py-8 text-red-500">
            <i class="fa-solid fa-exclamation-triangle text-3xl mb-2"></i>
            <p>Error loading attendance</p>
            <p class="text-xs mt-1">${error.message}</p>
            <button onclick="loadAttendanceSheet()" class="mt-3 text-blue-600 text-xs underline">Try Again</button>
        </div>`;
    }
};

// Helper functions for bulk actions
window.markAllPresent = () => {
    document.querySelectorAll('.attendance-checkbox').forEach(cb => {
        cb.checked = true;
    });
};

window.markAllAbsent = () => {
    document.querySelectorAll('.attendance-checkbox').forEach(cb => {
        cb.checked = false;
    });
};

// Updated submit function that preserves existing data structure
window.submitStudentAttendance = async (classID) => {
    if (!navigator.onLine) {
        alert("No Internet! Please connect to submit attendance.");
        return;
    }

    const dateKey = new Date().toISOString().split('T')[0];
    const checkboxes = document.querySelectorAll('.attendance-checkbox');
    const attendanceRecords = {};
    let savedCount = 0;
    
    checkboxes.forEach(cb => {
        const studentKey = cb.getAttribute('data-student-key');
        const studentName = cb.getAttribute('data-student-name');
        const grNo = cb.getAttribute('data-gr-no');
        const isPresent = cb.checked;
        
        if (isPresent) savedCount++;
        
        attendanceRecords[studentKey] = {
            name: studentName,
            grNo: grNo || 'Pending',
            status: isPresent ? 'Present' : 'Absent',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            markedBy: localStorage.getItem('userName')
        };
    });

    // Show saving indicator
    const saveBtn = document.querySelector('button[onclick*="submitStudentAttendance"]');
    const originalText = saveBtn?.innerHTML;
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Saving...';
        saveBtn.disabled = true;
    }
    
    try {
        await firebase.database().ref(`student_attendance/${dateKey}/${classID}`).set({
            markedBy: localStorage.getItem('userName'),
            records: attendanceRecords,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            class: classID,
            totalPresent: savedCount,
            totalStudents: checkboxes.length
        });
        
        // Show success message with summary
        const totalStudents = checkboxes.length;
        const percentage = Math.round((savedCount / totalStudents) * 100);
        
        alert(`✅ Attendance for Class ${classID} saved successfully!\n\n📊 Summary:\nPresent: ${savedCount}/${totalStudents}\nAttendance Rate: ${percentage}%`);
        
        // Refresh the attendance sheet to show updated data
        await loadAttendanceSheet();
        
    } catch (err) {
        alert("❌ Error saving attendance: " + err.message);
        console.error(err);
    } finally {
        if (saveBtn) {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }
};

// Helper functions for mass selection
window.markAllPresent = () => {
    document.querySelectorAll('.attendance-checkbox').forEach(cb => {
        cb.checked = true;
    });
};

window.markAllAbsent = () => {
    document.querySelectorAll('.attendance-checkbox').forEach(cb => {
        cb.checked = false;
    });
};

window.submitStudentAttendance = (classID) => {
    if (!navigator.onLine) {
        alert("No Internet! Please connect to submit attendance.");
        return;
    }

    const dateKey = new Date().toISOString().split('T')[0];
    const checkboxes = document.querySelectorAll('.attendance-checkbox');
    const attendanceData = {};
    
    checkboxes.forEach(cb => {
        const studentKey = cb.getAttribute('data-student-key');
        const studentName = cb.getAttribute('data-student-name');
        const grNo = cb.getAttribute('data-gr-no');
        
        attendanceData[studentKey] = {
            name: studentName,
            grNo: grNo || 'Pending',
            status: cb.checked ? 'Present' : 'Absent',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
    });

    firebase.database().ref(`student_attendance/${dateKey}/${classID}`).set({
        markedBy: localStorage.getItem('userName'),
        records: attendanceData,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        class: classID
    }).then(() => {
        alert(`✅ Attendance for Class ${classID} saved!`);
        updateHomeSummary();
        loadSection('attendance');
    }).catch(err => alert("Error: " + err.message));
};

window.submitStudentAttendance = (classID) => {
    if (!navigator.onLine) {
        alert("No Internet! Please connect to submit attendance.");
        return;
    }

    const dateKey = new Date().toISOString().split('T')[0];
    const checkboxes = document.querySelectorAll('.attendance-checkbox');
    const attendanceData = {};
    
    checkboxes.forEach(cb => {
        const studentName = cb.getAttribute('data-name'); // Full name
        attendanceData[studentName] = {
            name: studentName,
            status: cb.checked ? 'Present' : 'Absent',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
    });

    firebase.database().ref(`student_attendance/${dateKey}/${classID}`).set({
        markedBy: localStorage.getItem('userName'),
        records: attendanceData
    }).then(() => {
        alert(`Attendance for Class ${classID} saved!`);
        updateHomeSummary();
        loadSection('attendance');
    }).catch(err => alert("Error: " + err.message));
};


// 13. STAFF LOGS
function loadStaffLogsDetail() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="space-y-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <button onclick="loadSection('home')" class="p-2 bg-gray-100 rounded-full mr-2"><i class="fa-solid fa-arrow-left"></i></button>
                    <h2 class="text-lg font-bold">Staff Logs</h2>
                </div>
                <span class="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full" id="log-count">0 Logs</span>
            </div>
            <input type="text" id="staffLogSearch" onkeyup="filterStaffLogs()" placeholder="Search teacher..." class="w-full p-3 bg-white rounded-xl text-sm border shadow-sm">
            <div id="full-staff-log-container" class="space-y-2 pb-10"><p class="text-center py-10 text-gray-400">Loading...</p></div>
        </div>
    `;
    fetchFullStaffLogs();
}

function fetchFullStaffLogs() {
    const dateKey = new Date().toISOString().split('T')[0];
    const container = document.getElementById('full-staff-log-container');
    const countBadge = document.getElementById('log-count');

    firebase.database().ref('attendance/' + dateKey).on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            container.innerHTML = `<div class="text-center py-10 text-gray-400">No logs today.</div>`;
            return;
        }
        const logs = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
        if (countBadge) countBadge.innerText = `${logs.length} Logs`;
        renderStaffLogList(logs);
    });
}

function renderStaffLogList(logs) {
    const container = document.getElementById('full-staff-log-container');
    if (!container) return;
    if (logs.length === 0) {
        container.innerHTML = `<p class="text-center py-10 text-gray-400">No matching records.</p>`;
        return;
    }
    container.innerHTML = logs.map(log => `
        <div class="bg-white p-4 rounded-2xl border shadow-sm flex justify-between items-center">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full ${log.type.includes('OUT') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'} flex items-center justify-center font-bold">
                    ${log.name.charAt(0).toUpperCase()}
                </div>
                <div>
                    <p class="font-bold text-gray-800 text-sm">${log.name}</p>
                    <p class="text-[10px] text-gray-400">${log.distance} from office</p>
                </div>
            </div>
            <div class="text-right">
                <p class="font-bold text-sm ${log.type.includes('OUT') ? 'text-red-600' : 'text-green-600'}">${log.type.replace('[LATE] ', '')}</p>
                <p class="text-[10px] text-gray-400">${log.time}</p>
            </div>
        </div>
    `).join('');
}

window.filterStaffLogs = () => {
    const term = document.getElementById('staffLogSearch').value.toLowerCase();
    // Re-fetch and filter
    const dateKey = new Date().toISOString().split('T')[0];
    firebase.database().ref('attendance/' + dateKey).once('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        const logs = Object.values(data).filter(log => log.name.toLowerCase().includes(term));
        renderStaffLogList(logs);
    });
};

// 14. CLASS ATTENDANCE STATUS
function loadClassAttendanceStatus() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="space-y-4">
            <div class="flex items-center">
                <button onclick="loadSection('home')" class="p-2 bg-gray-100 rounded-full mr-2"><i class="fa-solid fa-arrow-left"></i></button>
                <h2 class="text-lg font-bold">Class Attendance Status</h2>
            </div>
            <div id="class-status-container" class="grid gap-3 pb-10"><p class="text-center py-10 text-gray-400">Loading...</p></div>
        </div>
    `;
    fetchClassAttendanceStatus();
}

// 14. CLASS ATTENDANCE STATUS - Shows saved status correctly
function fetchClassAttendanceStatus() {
    const dateKey = new Date().toISOString().split('T')[0];
    const container = document.getElementById('class-status-container');

    firebase.database().ref(`student_attendance/${dateKey}`).on('value', (snapshot) => {
        const attendanceData = snapshot.val() || {};
        
        // Also fetch student counts from CSV
        fetch(STUDENT_SHEET_CSV).then(response => response.text()).then(text => {
            const rows = text.split('\n').filter(row => row.trim()).slice(1);
            const classCounts = {};
            
            rows.forEach(row => {
                const cols = row.split(',');
                const studentClass = cols[1]?.replace(/"/g, '').trim();
                if (studentClass) {
                    classCounts[studentClass] = (classCounts[studentClass] || 0) + 1;
                }
            });
            
            container.innerHTML = schoolClasses.map(className => {
                const record = attendanceData[className];
                const isMarked = !!record;
                const studentCount = classCounts[className] || 0;
                const markedCount = record?.records ? Object.keys(record.records).length : 0;
                const presentCount = record?.records ? Object.values(record.records).filter(r => r.status === 'Present').length : 0;
                const absentCount = markedCount - presentCount;
                const pendingCount = studentCount - markedCount;
                
                let statusColor = 'bg-gray-100 text-gray-600';
                let statusText = 'Not Started';
                
                if (isMarked) {
                    if (markedCount === studentCount) {
                        statusColor = 'bg-green-100 text-green-600';
                        statusText = '✅ Complete';
                    } else if (markedCount > 0) {
                        statusColor = 'bg-yellow-100 text-yellow-600';
                        statusText = '⚠️ Partial';
                    } else {
                        statusColor = 'bg-orange-100 text-orange-600';
                        statusText = '📝 Marked (No Students)';
                    }
                } else {
                    statusColor = 'bg-gray-100 text-gray-600';
                    statusText = '⏳ Pending';
                }
                
                return `
                    <div class="bg-white p-4 rounded-2xl border shadow-sm hover:shadow-md transition-all">
                        <div class="flex justify-between items-start mb-3">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-xl ${isMarked ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'} flex flex-col items-center justify-center">
                                    <span class="text-[10px] font-bold">Class</span>
                                    <span class="text-lg font-black">${className}</span>
                                </div>
                                <div>
                                    <p class="font-bold text-gray-800">${className}</p>
                                    <p class="text-[10px] text-gray-400">Total: ${studentCount} students</p>
                                </div>
                            </div>
                            <span class="px-2 py-1 rounded-full text-[10px] font-bold ${statusColor}">${statusText}</span>
                        </div>
                        
                        ${isMarked ? `
                            <div class="grid grid-cols-3 gap-2 mb-3 text-center">
                                <div class="bg-green-50 rounded-lg p-2">
                                    <p class="text-lg font-bold text-green-600">${presentCount}</p>
                                    <p class="text-[9px] text-gray-500">Present</p>
                                </div>
                                <div class="bg-red-50 rounded-lg p-2">
                                    <p class="text-lg font-bold text-red-600">${absentCount}</p>
                                    <p class="text-[9px] text-gray-500">Absent</p>
                                </div>
                                <div class="bg-gray-50 rounded-lg p-2">
                                    <p class="text-lg font-bold text-gray-600">${pendingCount}</p>
                                    <p class="text-[9px] text-gray-500">Pending</p>
                                </div>
                            </div>
                            <div class="text-[10px] text-gray-400 text-center mb-3">
                                <i class="fa-regular fa-user-check mr-1"></i>Marked by: ${record.markedBy}
                            </div>
                        ` : ''}
                        
                        <button onclick="loadAttendanceForClass('${className}')" 
                            class="w-full py-2 rounded-lg text-xs font-bold transition-all ${isMarked ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">
                            ${isMarked ? '📋 View / Edit' : '✏️ Mark Attendance'}
                        </button>
                    </div>
                `;
            }).join('');
        }).catch(err => {
            console.error("Error loading class counts:", err);
            container.innerHTML = `<p class="text-center py-10 text-red-500">Error loading class data</p>`;
        });
    });
}

window.loadAttendanceForClass = (className) => {
    loadSection('attendance');
    setTimeout(() => {
        const selector = document.getElementById('target-class');
        if (selector) {
            selector.value = className;
            loadAttendanceSheet();
        }
    }, 100);
};

// 15. TIME TABLE FUNCTIONS
window.openDailyTimeTable = () => {
    const content = document.getElementById('content');
    const role = localStorage.getItem('userRole');
    const mappedClass = localStorage.getItem('mappedClass');
    const isAdmin = ['Admin', 'Super Admin', 'Supervisor', 'Clerk'].includes(role);
    
    content.innerHTML = `
        <div class="space-y-4 pb-20">
            <div class="flex items-center justify-between">
                <button onclick="loadSection('home')" class="p-2 bg-gray-100 rounded-full"><i class="fa-solid fa-arrow-left"></i></button>
                <h2 class="text-xl font-bold">Daily Time Table</h2>
                ${isAdmin ? `<button onclick="saveClassTimetable()" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold">SAVE</button>` : '<div></div>'}
            </div>
            <div class="${role === 'Student' ? 'hidden' : 'block'} bg-white p-3 rounded-xl border">
                <select id="tt-class-select" onchange="loadClassTimetable(this.value)" class="w-full p-2 bg-gray-50 rounded-lg font-bold text-sm">
                    <option value="">-- Select Class --</option>
                    ${schoolClasses.map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
            </div>
            <div id="tt-display-grid" class="bg-white rounded-xl shadow-sm border overflow-hidden">
                <p class="p-10 text-center text-gray-400 text-sm">Select a class to view timetable</p>
            </div>
        </div>
    `;
    if (role === 'Student' && mappedClass) {
        loadClassTimetable(mappedClass);
    }
};

window.loadClassTimetable = async (className) => {
    const grid = document.getElementById('tt-display-grid');
    const role = localStorage.getItem('userRole');
    const isAdmin = ['Admin', 'Super Admin', 'Supervisor', 'Clerk'].includes(role);
    
    if (!className) return;
    
    try {
        const snap = await firebase.database().ref("timetable/class/" + className).once('value');
        const data = snap.val() || {};
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const totalPeriods = 8;
        const fridayMaxPeriod = 4;

        let html = '<div class="overflow-x-auto"><table class="w-full border-collapse text-sm">';
        
        // Header
        html += `<thead><tr class="bg-green-600 text-white">
            <th class="p-3 border border-green-500 text-center font-bold w-16">Period</th>
            ${days.map(d => `<th class="p-3 border border-green-500 text-center font-bold">${d}</th>`).join('')}
         </tr></thead><tbody>`;
        
        // Body - Periods 1 to 8
        for (let period = 1; period <= totalPeriods; period++) {
            const isFridayPeriod = period > fridayMaxPeriod;
            
            html += `<tr class="${isFridayPeriod ? 'bg-gray-50' : 'hover:bg-gray-50'}">`;
            html += `<td class="p-3 border text-center font-bold ${isFridayPeriod ? 'text-gray-400' : 'text-green-600 bg-green-50'}">${period}${isFridayPeriod ? '†' : ''}</td>`;
            
            for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
                const day = days[dayIdx];
                
                // Handle Friday special case
                if (day === 'Friday' && isFridayPeriod) {
                    if (period === 5) {
                        const rowspan = totalPeriods - fridayMaxPeriod;
                        html += `<td rowspan="${rowspan}" class="p-3 border text-center bg-amber-50 align-middle">
                            <div class="flex flex-col items-center">
                                <i class="fa-regular fa-clock text-amber-500 mb-1"></i>
                                <span class="text-amber-700 font-medium text-xs">Early Dismissal</span>
                                <span class="text-amber-500 text-[10px]">No classes</span>
                            </div>
                        </td>`;
                    }
                    continue;
                }
                
                const value = (data[day] && data[day][period]) ? data[day][period] : "";
                
                if (isAdmin) {
                    html += `<td class="p-1 border"><input type="text" id="cell-${day}-${period}" value="${value}" class="w-full p-2 text-xs border-none focus:bg-yellow-50 rounded" placeholder="Subject"></td>`;
                } else {
                    html += `<td class="p-3 border text-gray-700 text-xs">${value || '—'}</td>`;
                }
            }
            html += `</tr>`;
        }
        
        // Footer note
        html += `<tr class="bg-gray-50"><td colspan="7" class="p-3 text-xs text-gray-500">
            <i class="fa-regular fa-clock mr-1"></i> <strong>Note:</strong> Friday has only 4 periods (Early dismissal)
        </td></tr>`;
        
        html += `</tbody></table></div>`;
        grid.innerHTML = html;
    } catch (err) {
        grid.innerHTML = `<p class="p-5 text-red-500">Error: ${err.message}</p>`;
    }
};

window.saveClassTimetable = async () => {
    const classSelect = document.getElementById('tt-class-select');
    const className = classSelect ? classSelect.value : null;
    if (!className) return alert("Select a class first!");
    
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const totalPeriods = 8;
    const fridayMaxPeriod = 4;
    const timetableData = {};
    
    days.forEach(day => {
        timetableData[day] = {};
    });
    
    for (let period = 1; period <= totalPeriods; period++) {
        for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
            const day = days[dayIdx];
            
            // Skip saving for Friday periods 5-8
            if (day === 'Friday' && period > fridayMaxPeriod) {
                continue;
            }
            
            const cell = document.getElementById(`cell-${day}-${period}`);
            if (cell) {
                timetableData[day][period] = cell.value.trim();
            }
        }
    }
    
    try {
        await firebase.database().ref("timetable/class/" + className).set(timetableData);
        alert(`✅ Timetable for Class ${className} saved!\n📅 Friday has 4 periods only`);
    } catch (err) {
        alert("Error: " + err.message);
    }
};

window.openExamTimeTable = () => {
    const content = document.getElementById('content');
    const role = localStorage.getItem('userRole');
    const mappedClass = localStorage.getItem('mappedClass');
    const isAdmin = ['Admin', 'Super Admin', 'Supervisor', 'Clerk'].includes(role);
    
    content.innerHTML = `
        <div class="space-y-4 pb-20">
            <div class="flex items-center justify-between">
                <button onclick="loadSection('home')" class="p-2 bg-gray-100 rounded-full"><i class="fa-solid fa-arrow-left"></i></button>
                <h2 class="text-xl font-bold">Exam Time Table</h2>
                ${isAdmin ? `<button onclick="saveExamTimetable()" class="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold">SAVE</button>` : '<div></div>'}
            </div>
            <div class="${role === 'Student' ? 'hidden' : 'block'} bg-white p-3 rounded-xl border">
                <select id="exam-class-select" onchange="loadExamTimetable(this.value)" class="w-full p-2 bg-gray-50 rounded-lg font-bold text-sm">
                    <option value="">-- Select Class --</option>
                    ${schoolClasses.map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
            </div>
            <div id="exam-display-grid" class="bg-white rounded-xl shadow-sm border overflow-hidden">
                <p class="p-10 text-center text-gray-400 text-sm">Select a class to view exam timetable</p>
            </div>
        </div>
    `;
    if (role === 'Student' && mappedClass) {
        loadExamTimetable(mappedClass);
    }
};

window.loadExamTimetable = async (className) => {
    const grid = document.getElementById('exam-display-grid');
    const role = localStorage.getItem('userRole');
    const isAdmin = ['Admin', 'Super Admin', 'Supervisor', 'Clerk'].includes(role);
    
    try {
        const snap = await firebase.database().ref("exam_timetable/" + className).once('value');
        const data = snap.val() || {};
        
        let html = `<div class="overflow-x-auto"><table class="w-full border-collapse"><thead class="bg-gray-50"><tr><th class="p-2 border text-xs">Date</th><th class="p-2 border text-xs">Day</th><th class="p-2 border text-xs">Time</th><th class="p-2 border text-xs">Subject</th></tr></thead><tbody>`;
        
        for (let i = 1; i <= 10; i++) {
            const rowData = data[i] || { date: "", day: "", time: "", sub: "" };
            html += `<tr>
                <td class="p-2 border">${isAdmin ? `<input type="text" id="ex-date-${i}" value="${rowData.date}" class="w-full p-1 text-xs border-none bg-gray-50 rounded">` : `<span class="text-xs">${rowData.date || '-'}</span>`}</td>
                <td class="p-2 border">${isAdmin ? `<input type="text" id="ex-day-${i}" value="${rowData.day}" class="w-full p-1 text-xs border-none bg-gray-50 rounded">` : `<span class="text-xs">${rowData.day || '-'}</span>`}</td>
                <td class="p-2 border">${isAdmin ? `<input type="text" id="ex-time-${i}" value="${rowData.time}" class="w-full p-1 text-xs border-none bg-gray-50 rounded">` : `<span class="text-xs">${rowData.time || '-'}</span>`}</td>
                <td class="p-2 border">${isAdmin ? `<input type="text" id="ex-sub-${i}" value="${rowData.sub}" class="w-full p-1 text-xs border-none bg-blue-50 rounded">` : `<span class="text-xs font-bold text-blue-600">${rowData.sub || '-'}</span>`}</td>
            </tr>`;
        }
        html += `</tbody></table></div>`;
        grid.innerHTML = html;
    } catch (err) {
        grid.innerHTML = `<p class="p-5 text-red-500">Error: ${err.message}</p>`;
    }
};

window.saveExamTimetable = async () => {
    const className = document.getElementById('exam-class-select').value;
    if (!className) return alert("Select a class first!");
    
    const examData = {};
    for (let i = 1; i <= 10; i++) {
        examData[i] = {
            date: document.getElementById(`ex-date-${i}`)?.value.trim() || "",
            day: document.getElementById(`ex-day-${i}`)?.value.trim() || "",
            time: document.getElementById(`ex-time-${i}`)?.value.trim() || "",
            sub: document.getElementById(`ex-sub-${i}`)?.value.trim() || ""
        };
    }
    
    try {
        await firebase.database().ref("exam_timetable/" + className).set(examData);
        alert(`Exam Timetable saved for Class ${className}`);
    } catch (err) {
        alert("Error: " + err.message);
    }
};

// UPDATED: Teacher Time Table - Matrix format (6 columns x 8 rows, Friday 4 rows)
window.openTeacherTimeTable = () => {
    const content = document.getElementById('content');
    const role = localStorage.getItem('userRole');
    const teacherName = localStorage.getItem('userName');
    const isAdmin = ['Admin', 'Super Admin', 'Supervisor', 'Clerk'].includes(role);
    
    // For regular teachers - show only their own timetable (read-only)
    if (!isAdmin && role === 'Teacher') {
        content.innerHTML = `
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <button onclick="loadSection('home')" class="p-2 bg-gray-100 rounded-full">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <h2 class="text-lg font-bold">My Time Table</h2>
                    <div></div>
                </div>
                
                <div class="bg-gradient-to-r from-purple-600 to-indigo-700 p-4 rounded-2xl text-white">
                    <div class="flex items-center gap-3">
                        <i class="fa-solid fa-chalkboard-user text-3xl"></i>
                        <div>
                            <p class="text-xs opacity-80">Teacher Schedule</p>
                            <p class="font-bold text-lg">${teacherName}</p>
                        </div>
                    </div>
                </div>
                
                <div id="teacher-own-timetable" class="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div class="p-8 text-center text-gray-400">
                        <i class="fa-solid fa-spinner fa-spin text-2xl mb-2"></i>
                        <p>Loading your timetable...</p>
                    </div>
                </div>
            </div>
        `;
        
        // Load the logged-in teacher's timetable (read-only view)
        loadTeacherOwnTimetableMatrix(teacherName, false);
        return;
    }
    
    // For Admin/Supervisor - full management interface with edit capability
    content.innerHTML = `
        <div class="space-y-4">
            <div class="flex items-center justify-between">
                <button onclick="loadSection('home')" class="p-2 bg-gray-100 rounded-full">
                    <i class="fa-solid fa-arrow-left"></i>
                </button>
                <h2 class="text-lg font-bold">Teacher Time Table Manager</h2>
                <button onclick="saveTeacherTimetableMatrix()" class="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold">
                    <i class="fa-solid fa-save mr-1"></i>SAVE
                </button>
            </div>
            
            <div class="bg-white p-4 rounded-xl shadow">
                <label class="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Select Teacher</label>
                <select id="teacherSelect" class="w-full p-3 bg-gray-50 rounded-xl text-sm border mb-4">
                    <option value="">-- Select Teacher --</option>
                </select>
                
                <div id="teacher-tt-container" class="mt-4">
                    <p class="text-center text-gray-400 py-8">Select a teacher to view/edit timetable</p>
                </div>
            </div>
        </div>
    `;
    
    loadTeacherDropdownForMatrix();
};

async function loadTeacherDropdownForMatrix() {
    try {
        const res = await fetch(TEACHER_SHEET_CSV);
        const text = await res.text();
        const rows = text.split('\n').slice(1);
        const teachers = [];
        
        for (let i = 0; i < rows.length; i++) {
            if (!rows[i].trim()) continue;
            // Parse CSV properly
            const cols = rows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (cols[2]) {
                let name = cols[2].replace(/"/g, '').trim();
                if (name) teachers.push(name);
            }
        }
        
        const select = document.getElementById('teacherSelect');
        if (select) {
            select.innerHTML = '<option value="">-- Select Teacher --</option>' + 
                teachers.map(t => `<option value="${t}">${t}</option>`).join('');
            select.onchange = () => loadTeacherTimetableForEditMatrix(select.value);
        }
    } catch (e) {
        console.error("Error loading teachers:", e);
        const select = document.getElementById('teacherSelect');
        if (select) select.innerHTML = '<option value="">Error loading teachers</option>';
    }
}
async function loadTeacherTimetableForEditMatrix(teacherName) {
    const container = document.getElementById('teacher-tt-container');
    if (!teacherName) {
        container.innerHTML = '<p class="text-center text-gray-400 py-8">Select a teacher to view/edit timetable</p>';
        return;
    }
    
    container.innerHTML = `<div class="p-8 text-center text-gray-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading...</div>`;
    
    try {
        const sanitizedKey = teacherName.toLowerCase().replace(/\s+/g, '_');
        const snap = await firebase.database().ref(`teacher_timetables/${sanitizedKey}`).once('value');
        const data = snap.val();
        const schedule = data?.schedule || {};
        
        // Render editable matrix
        renderTeacherTimetableMatrix(container, teacherName, schedule, true);
    } catch (err) {
        container.innerHTML = `<p class="text-red-500 p-8 text-center">Error loading timetable: ${err.message}</p>`;
    }
}

// Load teacher's own timetable (Teacher view - Read-only)
async function loadTeacherOwnTimetableMatrix(teacherName, isEditable = false) {
    const container = document.getElementById('teacher-own-timetable');
    if (!container) return;
    
    try {
        const sanitizedKey = teacherName.toLowerCase().replace(/\s+/g, '_');
        let schedule = null;
        
        // Try multiple paths
        const snap1 = await firebase.database().ref(`teacher_timetables/${sanitizedKey}`).once('value');
        if (snap1.exists()) {
            schedule = snap1.val()?.schedule;
        }
        
        if (!schedule) {
            const snap2 = await firebase.database().ref(`timetable/teacher/${teacherName}`).once('value');
            if (snap2.exists()) {
                schedule = snap2.val();
            }
        }
        
        if (!schedule) {
            container.innerHTML = `
                <div class="p-8 text-center">
                    <i class="fa-solid fa-calendar-times text-5xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500 font-medium">No timetable assigned yet</p>
                    <p class="text-xs text-gray-400 mt-2">Please contact the school administrator</p>
                </div>
            `;
            return;
        }
        
        // Render read-only matrix
        renderTeacherTimetableMatrix(container, teacherName, schedule, false);
    } catch (error) {
        console.error("Error loading teacher timetable:", error);
        container.innerHTML = `<div class="p-8 text-center text-red-500">Error loading timetable</div>`;
    }
}

// Render Teacher Time Table in matrix format (8 periods x 6 days, Friday 4 periods)
function renderTeacherTimetableMatrix(container, teacherName, schedule, isEditable) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const totalPeriods = 8;
    const fridayMaxPeriod = 4; // Friday only 4 periods
    
    let html = `
        <div class="overflow-x-auto">
            <table class="w-full border-collapse text-sm">
                <thead>
                    <tr class="bg-purple-600 text-white">
                        <th class="p-3 border border-purple-500 text-center font-bold w-16">Period</th>
                        ${days.map(day => `<th class="p-3 border border-purple-500 text-center font-bold">${day}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
    `;
    
    // Render periods 1 to 8
    for (let period = 1; period <= totalPeriods; period++) {
        const isFridayPeriod = period > fridayMaxPeriod;
        
        html += `<tr class="${isFridayPeriod ? 'bg-gray-50' : 'hover:bg-gray-50'}">`;
        
        // Period number column
        html += `<td class="p-3 border text-center font-bold ${isFridayPeriod ? 'text-gray-400' : 'text-purple-600 bg-purple-50'}">
            ${period}${isFridayPeriod ? '†' : ''}
        </td>`;
        
        // Loop through each day
        for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
            const day = days[dayIdx];
            
            // Handle Friday special case
            if (day === 'Friday' && isFridayPeriod) {
                // For Friday periods 5-8: show "Early Dismissal" merged cell
                if (period === 5) {
                    // First of the merged rows - show the message
                    const rowspan = totalPeriods - fridayMaxPeriod; // rowspan = 4
                    html += `<td rowspan="${rowspan}" class="p-3 border text-center bg-amber-50 align-middle">
                        <div class="flex flex-col items-center">
                            <i class="fa-solid fa-bell text-amber-500 text-lg mb-1"></i>
                            <span class="text-amber-700 font-medium text-xs">Early Dismissal</span>
                            <span class="text-amber-500 text-[10px] mt-1">No classes after period 4</span>
                        </div>
                    </td>`;
                }
                // Skip the other rows (5-8) since they're merged
                continue;
            }
            
            // Regular period cell (or Friday period 1-4)
            const value = schedule?.[day]?.[period] || '';
            
            if (isEditable) {
                // Editable for Admin
                const placeholder = day === 'Friday' && period <= fridayMaxPeriod ? 
                    "Subject / Class (Fri - Period " + period + ")" : 
                    "Subject / Class";
                    
                html += `<td class="p-1 border">
                    <input type="text" id="cell-${day}-${period}" 
                        value="${value.replace(/"/g, '&quot;')}" 
                        class="w-full p-2 text-xs border-none focus:bg-yellow-50 rounded" 
                        placeholder="${placeholder}">
                 </td>`;
            } else {
                // Read-only for Teacher
                const displayValue = value || '—';
                html += `<td class="p-3 border text-gray-700 text-xs">${displayValue}</td>`;
            }
        }
        html += `</tr>`;
    }
    
    // Add footer note
    html += `
        <tr class="bg-gray-50 border-t-2">
            <td colspan="7" class="p-3 text-xs text-gray-500">
                <div class="flex items-center justify-between">
                    <div>
                        <i class="fa-regular fa-clock mr-1 text-amber-500"></i>
                        <strong>Note:</strong> Friday has only 4 periods (Early dismissal at 10:45 AM)
                        ${!isEditable ? '<br><span class="text-[10px] text-gray-400 ml-4">† Contact admin for schedule changes</span>' : ''}
                    </div>
                    ${isEditable ? `
                        <div class="text-[10px] text-purple-500">
                            <i class="fa-regular fa-keyboard mr-1"></i> Click any cell to edit
                        </div>
                    ` : ''}
                </div>
             </td>
         </tr>
    `;
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
}


// Save Teacher Timetable (Admin function)
window.saveTeacherTimetableMatrix = async () => {
    const teacher = document.getElementById('teacherSelect')?.value;
    if (!teacher) {
        alert("Please select a teacher first!");
        return;
    }
    
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const totalPeriods = 8;
    const fridayMaxPeriod = 4;
    const schedule = {};
    
    // Initialize schedule object for each day
    days.forEach(day => {
        schedule[day] = {};
    });
    
    // Collect data for all periods
    for (let period = 1; period <= totalPeriods; period++) {
        for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
            const day = days[dayIdx];
            
            // Skip saving for Friday periods 5-8 (they don't exist)
            if (day === 'Friday' && period > fridayMaxPeriod) {
                continue;
            }
            
            const input = document.getElementById(`cell-${day}-${period}`);
            if (input) {
                schedule[day][period] = input.value.trim();
            }
        }
    }
    
    const sanitizedKey = teacher.toLowerCase().replace(/\s+/g, '_');
    const saveData = {
        displayName: teacher,
        schedule: schedule,
        updatedBy: localStorage.getItem('userName'),
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        format: "matrix_8x6_friday_4periods",
        periodsPerDay: {
            "Monday": 8,
            "Tuesday": 8,
            "Wednesday": 8,
            "Thursday": 8,
            "Friday": 4,
            "Saturday": 8
        }
    };
    
    try {
        // Save to Firebase
        await firebase.database().ref(`teacher_timetables/${sanitizedKey}`).set(saveData);
        
        // Also save to legacy location for compatibility
        await firebase.database().ref(`timetable/teacher/${teacher}`).set(schedule);
        
        alert(`✅ Timetable saved successfully for ${teacher}!\n\n📅 Monday-Thursday & Saturday: 8 periods\n📅 Friday: 4 periods (Early dismissal)`);
        
        // If the saved teacher is the currently logged-in teacher, refresh their view
        if (teacher === localStorage.getItem('userName')) {
            loadTeacherOwnTimetableMatrix(teacher, false);
        }
    } catch (err) {
        alert("❌ Error saving: " + err.message);
    }
};

// Also update the saveTeacherTimetable function for backward compatibility
window.saveTeacherTimetable = window.saveTeacherTimetableMatrix;

// Publish toggle for admin
function updatePublishButtonUI() {
    const btn = document.getElementById('publishBtn');
    if (!btn) return;
    
    firebase.database().ref('settings/teacher_timetable_published').on('value', (snap) => {
        const isPub = snap.val() || false;
        btn.innerText = isPub ? "UNPUBLISH" : "PUBLISH";
        btn.className = isPub ? "px-4 py-2 rounded-lg font-bold text-xs text-white bg-red-500" 
                             : "px-4 py-2 rounded-lg font-bold text-xs text-white bg-green-500";
    });
}

window.togglePublishTimetable = () => {
    const ref = firebase.database().ref('settings/teacher_timetable_published');
    ref.once('value', (snap) => {
        const currentState = snap.val() || false;
        ref.set(!currentState).then(() => {
            alert(currentState ? "Timetable hidden from teachers" : "Timetable published to teachers");
        });
    });
};

// Also update the loadTeacherDropdown function for matrix compatibility
async function loadTeacherDropdown() {
    await loadTeacherDropdownForMatrix();
}

async function loadTeacherOwnTimetable(teacherName) {
    const container = document.getElementById('teacher-own-timetable');
    if (!container) return;
    
    try {
        // Sanitize teacher name for Firebase key (must match how admin saves it)
        const sanitizedKey = teacherName.toLowerCase().replace(/\s+/g, '_');
        
        // Try multiple possible paths where timetable might be stored
        let timetableData = null;
        let dataSource = null;
        
        // Path 1: teacher_timetables/{key}
        const snap1 = await firebase.database().ref(`teacher_timetables/${sanitizedKey}`).once('value');
        if (snap1.exists()) {
            timetableData = snap1.val();
            dataSource = 'teacher_timetables';
        }
        
        // Path 2: timetable/teacher/{teacherName}
        if (!timetableData) {
            const snap2 = await firebase.database().ref(`timetable/teacher/${teacherName}`).once('value');
            if (snap2.exists()) {
                timetableData = snap2.val();
                dataSource = 'timetable/teacher';
            }
        }
        
        // Path 3: Look for any matching displayName in teacher_timetables
        if (!timetableData) {
            const allTeachers = await firebase.database().ref('teacher_timetables').once('value');
            if (allTeachers.exists()) {
                const teachers = allTeachers.val();
                for (const [key, value] of Object.entries(teachers)) {
                    if (value.displayName === teacherName || key === sanitizedKey) {
                        timetableData = value;
                        dataSource = 'teacher_timetables (by displayName)';
                        break;
                    }
                }
            }
        }
        
        if (!timetableData) {
            container.innerHTML = `
                <div class="p-8 text-center">
                    <i class="fa-solid fa-calendar-times text-5xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500 font-medium">No timetable assigned yet</p>
                    <p class="text-xs text-gray-400 mt-2">Please contact the school administrator</p>
                </div>
            `;
            return;
        }
        
        // Extract schedule data (handle different data structures)
        let schedule = null;
        if (timetableData.schedule) {
            schedule = timetableData.schedule;
        } else if (typeof timetableData === 'object' && !timetableData.displayName) {
            // Direct schedule object where keys are days
            schedule = timetableData;
        } else {
            schedule = timetableData;
        }
        
        // Define days in order
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        
        // Check if schedule has period structure or simple day structure
        const hasPeriods = schedule && Object.values(schedule).some(v => typeof v === 'object' && !Array.isArray(v));
        
        let html = '';
        
        if (hasPeriods && Object.keys(schedule).some(k => !isNaN(parseInt(k)))) {
            // Period-based timetable (matrix format)
            const periods = Object.keys(schedule).sort((a, b) => parseInt(a) - parseInt(b));
            html = `
                <div class="overflow-x-auto p-4">
                    <table class="w-full border-collapse text-sm">
                        <thead>
                            <tr class="bg-gray-50">
                                <th class="p-3 border text-left text-gray-600">Period</th>
                                ${days.map(d => `<th class="p-3 border text-left text-gray-600">${d}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${periods.map(period => `
                                <tr class="border-b hover:bg-gray-50">
                                    <td class="p-3 border font-bold text-purple-600">${period}</td>
                                    ${days.map(day => `
                                        <td class="p-3 border text-gray-700">
                                            ${schedule[period]?.[day] || '—'}
                                        </td>
                                    `).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            // Simple day-based timetable (each day has text)
            html = `
                <div class="divide-y">
                    ${days.map(day => `
                        <div class="p-4 hover:bg-gray-50">
                            <div class="flex items-start gap-3">
                                <div class="w-24 flex-shrink-0">
                                    <span class="font-bold text-purple-600 text-sm">${day}</span>
                                </div>
                                <div class="flex-1">
                                    <p class="text-gray-700 whitespace-pre-line">${schedule?.[day] || 'No classes scheduled'}</p>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        container.innerHTML = `
            <div class="p-4 border-b bg-gray-50 flex justify-between items-center">
                <span class="text-xs text-gray-500">Weekly Schedule</span>
                <span class="text-xs text-green-600"><i class="fa-regular fa-clock mr-1"></i>Current Academic Year</span>
            </div>
            ${html}
        `;
        
    } catch (error) {
        console.error("Error loading teacher timetable:", error);
        container.innerHTML = `
            <div class="p-8 text-center text-red-500">
                <i class="fa-solid fa-exclamation-triangle text-3xl mb-2"></i>
                <p>Error loading timetable</p>
                <p class="text-xs mt-2">${error.message}</p>
            </div>
        `;
    }
}

async function loadTeacherDropdown() {
    try {
        const res = await fetch(TEACHER_SHEET_CSV);
        const text = await res.text();
        const rows = text.split('\n').slice(1);
        const teachers = [];
        
        for (let i = 0; i < rows.length; i++) {
            if (!rows[i].trim()) continue;
            // Parse CSV properly handling quotes
            const match = rows[i].match(/(".*?"|[^,]*)(,|$)/g);
            if (match && match[2]) {
                let name = match[2].replace(/,/g, '').replace(/"/g, '').trim();
                if (name) teachers.push(name);
            }
        }
        
        const select = document.getElementById('teacherSelect');
        if (select) {
            select.innerHTML = '<option value="">Select Teacher</option>' + 
                teachers.map(t => `<option value="${t}">${t}</option>`).join('');
            select.onchange = () => loadTeacherTimetableForEdit(select.value);
        }
    } catch (e) {
        console.error("Error loading teachers:", e);
        const select = document.getElementById('teacherSelect');
        if (select) select.innerHTML = '<option value="">Error loading teachers</option>';
    }
}
async function loadTeacherTimetableForEdit(teacherName) {
    const container = document.getElementById('teacher-tt-container');
    if (!teacherName) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = `<div class="p-4 text-center text-gray-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading...</div>`;
    
    try {
        const sanitizedKey = teacherName.toLowerCase().replace(/\s+/g, '_');
        const snap = await firebase.database().ref(`teacher_timetables/${sanitizedKey}`).once('value');
        const data = snap.val();
        const schedule = data?.schedule || {};
        
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        let html = '<div class="space-y-3">';
        
        days.forEach(day => {
            html += `
                <div class="border rounded-lg overflow-hidden">
                    <div class="bg-gray-50 px-4 py-2 font-bold text-purple-600 text-sm border-b">${day}</div>
                    <textarea id="tt-${day}" class="w-full p-3 text-sm border-none focus:ring-2 focus:ring-purple-300 h-24" placeholder="Enter schedule for ${day}...">${schedule[day] || ''}</textarea>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = `<p class="text-red-500 p-4 text-center">Error loading timetable</p>`;
    }
}

// Publish toggle for admin
function updatePublishButtonUI() {
    const btn = document.getElementById('publishBtn');
    if (!btn) return;
    
    firebase.database().ref('settings/teacher_timetable_published').on('value', (snap) => {
        const isPub = snap.val() || false;
        btn.innerText = isPub ? "UNPUBLISH" : "PUBLISH";
        btn.className = isPub ? "px-4 py-2 rounded-lg font-bold text-xs text-white bg-red-500" 
                             : "px-4 py-2 rounded-lg font-bold text-xs text-white bg-green-500";
    });
}

window.togglePublishTimetable = () => {
    const ref = firebase.database().ref('settings/teacher_timetable_published');
    ref.once('value', (snap) => {
        const currentState = snap.val() || false;
        ref.set(!currentState).then(() => {
            alert(currentState ? "Timetable hidden from teachers" : "Timetable published to teachers");
        });
    });
};

async function loadTeacherTimetable(teacherName) {
    const container = document.getElementById('teacher-tt-container');
    if (!teacherName) {
        container.innerHTML = '';
        return;
    }
    
    try {
        const snap = await firebase.database().ref("teacher_timetables/" + teacherName.replace(/\s/g, '_').toLowerCase()).once('value');
        const data = snap.val();
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        
        let html = '';
        days.forEach(day => {
            html += `<div class="mb-2"><p class="font-bold text-xs text-gray-600">${day}</p><textarea id="tt-${day}" class="w-full p-2 text-sm rounded-lg border h-20">${data?.schedule?.[day] || ''}</textarea></div>`;
        });
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = '<p class="text-red-500">Error loading timetable</p>';
    }
}

window.saveTeacherTimetable = () => {
    const teacher = document.getElementById('teacherSelect').value;
    if (!teacher) return alert("Select a teacher first");
    
    const schedule = {};
    ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].forEach(day => {
        const textarea = document.getElementById(`tt-${day}`);
        if (textarea) schedule[day] = textarea.value;
    });
    
    const sanitizedKey = teacher.toLowerCase().replace(/\s+/g, '_');
    const saveData = {
        displayName: teacher,
        schedule: schedule,
        updatedBy: localStorage.getItem('userName'),
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    // Save to both locations for compatibility
    Promise.all([
        firebase.database().ref('teacher_timetables/' + sanitizedKey).set(saveData),
        firebase.database().ref('timetable/teacher/' + teacher).set(schedule)
    ]).then(() => {
        alert(`Timetable saved for ${teacher}!`);
        
        // If the saved teacher is the currently logged-in teacher, refresh view
        if (teacher === localStorage.getItem('userName')) {
            loadTeacherOwnTimetable(teacher);
        }
    }).catch(e => alert("Error: " + e.message));
};

// 16. FEES FUNCTIONS
window.showFeesDashboard = async () => {
    const content = document.getElementById('content');
    const role = localStorage.getItem('userRole');
    const userClass = localStorage.getItem('mappedClass');
    
    content.innerHTML = `<div class="flex justify-center p-10"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>`;
    
    try {
        const FEES_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvXFLMLsq-rdnjq7DGez4eDUlYupTGX9bDMOWnDF1zQifrq9r2nNISZJRT6-AaS_Pwg8RqZFbsfbMy/pub?gid=0&single=true&output=csv";
        const [studentRes, paymentRes] = await Promise.all([
            fetch(STUDENT_SHEET_CSV).then(r => r.text()),
            fetch(FEES_CSV_URL).then(r => r.text())
        ]);
        
        const students = parseCSV(studentRes);
        const payments = parseCSV(paymentRes);
        
        let html = `<div class="bg-gray-50 min-h-screen pb-20"><div class="sticky top-0 bg-white border-b p-4 flex items-center shadow-sm"><button onclick="loadSection('home')" class="mr-3 text-blue-600"><i class="fa-solid fa-arrow-left"></i></button><h2 class="text-lg font-bold">Fees Status</h2></div><div class="p-4"><div class="flex gap-2 mb-3"><input type="text" id="feeSearch" onkeyup="filterFeeList()" placeholder="Search..." class="flex-1 p-3 rounded-xl border text-sm"></div><div id="feeListContainer" class="space-y-3">`;
        
        students.forEach(student => {
            if (role === 'Teacher' && userClass && student.class !== userClass) return;
            const studentPayments = payments.filter(p => p.name?.toLowerCase() === student.name?.toLowerCase());
            const totalPaid = studentPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
            const totalFees = parseFloat(student.totalFees) || 0;
            const balance = totalFees - totalPaid;
            const cardColor = balance > 0 ? 'border-orange-400' : 'border-green-500';
            
            html += `<div class="fee-item bg-white p-4 rounded-2xl shadow-sm border-l-4 ${cardColor}"><div class="flex justify-between"><div><p class="font-bold text-gray-800">${student.name}</p><p class="text-xs text-gray-500">Class ${student.class} | GR: ${student.gr}</p></div><div class="text-right"><p class="text-xs text-gray-400">Paid: ₹${totalPaid}</p><p class="text-sm font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}">${balance > 0 ? `Pending: ₹${balance}` : 'FULL PAID'}</p></div></div></div>`;
        });
        
        html += `</div></div></div>`;
        content.innerHTML = html;
    } catch (err) {
        content.innerHTML = `<p class="p-10 text-center text-red-500">Error loading fees data.</p>`;
    }
};

function parseCSV(csvText) {
    const rows = csvText.split('\n').slice(1);
    const headers = csvText.split('\n')[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
    return rows.map(row => {
        const cols = row.split(',');
        const obj = {};
        headers.forEach((h, i) => { obj[h] = cols[i]?.replace(/"/g, '').trim(); });
        return obj;
    }).filter(obj => obj.name);
}

window.filterFeeList = () => {
    const query = document.getElementById('feeSearch')?.value.toLowerCase();
    if (!query) return;
    document.querySelectorAll('.fee-item').forEach(item => {
        item.style.display = item.innerText.toLowerCase().includes(query) ? 'block' : 'none';
    });
};

window.showFeesChart = async () => {
    const content = document.getElementById('content');
    content.innerHTML = `<div class="flex justify-center p-10"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>`;
    
    try {
        const FEES_CHART_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvXFLMLsq-rdnjq7DGez4eDUlYupTGX9bDMOWnDF1zQifrq9r2nNISZJRT6-AaS_Pwg8RqZFbsfbMy/pub?gid=936130121&single=true&output=csv";
        const response = await fetch(FEES_CHART_URL);
        const data = await response.text();
        const rows = data.split('\n').filter(row => row.trim());
        
        let html = `<div class="bg-white min-h-screen"><div class="sticky top-0 bg-white border-b p-4 flex items-center"><button onclick="loadSection('more')" class="mr-3 text-blue-600"><i class="fa-solid fa-arrow-left"></i></button><h2 class="text-lg font-bold">Fees Chart</h2></div><div class="overflow-x-auto"><table class="w-full border-collapse"><thead>`;
        
        const headers = rows[0].split(',');
        html += `<tr class="bg-blue-600">${headers.map(h => `<th class="p-3 text-left text-xs text-white">${h.replace(/"/g, '')}</th>`).join('')}</tr></thead><tbody>`;
        
        for (let i = 1; i < rows.length; i++) {
            const cols = rows[i].split(',');
            html += `<tr class="border-b">${cols.map(c => `<td class="p-3 text-xs text-gray-700">${c.replace(/"/g, '')}</td>`).join('')}</tr>`;
        }
        html += `</tbody></table></div></div>`;
        content.innerHTML = html;
    } catch (err) {
        content.innerHTML = `<p class="p-10 text-center text-red-500">Error loading chart.</p>`;
    }
};

// 17. MONTHLY HOURS CALCULATION
window.calculateMonthlyHours = async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const userName = localStorage.getItem('userName');
    
    const snapshot = await firebase.database().ref('attendance').once('value');
    const allData = snapshot.val();
    let totalMinutes = 0;
    
    Object.keys(allData || {}).forEach(dateStr => {
        if (dateStr.startsWith(`${year}-${month.toString().padStart(2, '0')}`)) {
            const logs = Object.values(allData[dateStr]);
            let inTime = null, outTime = null;
            logs.forEach(log => {
                if (log.name === userName) {
                    if (log.type.includes('IN')) inTime = log.timestamp;
                    if (log.type.includes('OUT')) outTime = log.timestamp;
                }
            });
            if (inTime && outTime) {
                totalMinutes += Math.floor((outTime - inTime) / 60000);
            }
        }
    });
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    alert(`Monthly Hours for ${userName}:\nTotal: ${hours} hours ${minutes} minutes\n${totalMinutes} minutes total`);
};

// 18. PERSONAL STUDENT LOGS - Works with or without GR numbers
async function fetchPersonalStudentLogs(studentName) {
    const logContainer = document.getElementById('personal-logs');
    if (!logContainer) return;
    
    logContainer.innerHTML = '<div class="text-center py-8"><i class="fa-solid fa-spinner fa-spin text-2xl text-gray-400"></i><p class="text-gray-400 text-sm mt-2">Loading your records...</p></div>';
    
    try {
        const studentGR = localStorage.getItem('userGR');
        const studentFullName = studentName.trim();
        
        console.log("Fetching attendance for:", studentFullName, "GR:", studentGR || "No GR (Pending)");
        
        // Get all attendance records
        const snapshot = await firebase.database().ref('student_attendance').once('value');
        const allData = snapshot.val();
        
        let presentDays = 0, absentDays = 0;
        let records = [];
        
        if (allData) {
            // Loop through each date
            Object.keys(allData).forEach(dateStr => {
                const dateData = allData[dateStr];
                
                // Loop through each class on that date
                Object.keys(dateData).forEach(className => {
                    const classData = dateData[className];
                    
                    if (classData && classData.records) {
                        // Try to find student by various methods
                        let studentRecord = null;
                        
                        // Method 1: Try by GR number (if student has one)
                        if (studentGR && studentGR !== 'Pending' && classData.records[studentGR]) {
                            studentRecord = classData.records[studentGR];
                        }
                        // Method 2: Try by name (exact match)
                        else if (classData.records[studentFullName]) {
                            studentRecord = classData.records[studentFullName];
                        }
                        // Method 3: Try case-insensitive name match on stored records
                        else {
                            for (const [key, record] of Object.entries(classData.records)) {
                                if (record.name && record.name.toLowerCase() === studentFullName.toLowerCase()) {
                                    studentRecord = record;
                                    break;
                                }
                            }
                        }
                        
                        // Method 4: Try partial name match (for names with extra spaces)
                        if (!studentRecord) {
                            for (const [key, record] of Object.entries(classData.records)) {
                                if (record.name && record.name.toLowerCase().includes(studentFullName.toLowerCase())) {
                                    studentRecord = record;
                                    break;
                                }
                            }
                        }
                        
                        if (studentRecord) {
                            records.push({ 
                                date: dateStr, 
                                status: studentRecord.status,
                                markedBy: classData.markedBy,
                                className: className
                            });
                            if (studentRecord.status === 'Present') presentDays++;
                            if (studentRecord.status === 'Absent') absentDays++;
                        }
                    }
                });
            });
        }
        
        // Sort records by date (newest first)
        records.sort((a, b) => b.date.localeCompare(a.date));
        
        // Get current month records only
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const currentMonthRecords = records.filter(r => r.date.startsWith(currentMonth));
        const currentMonthPresent = currentMonthRecords.filter(r => r.status === 'Present').length;
        
        if (records.length === 0) {
            logContainer.innerHTML = `
                <div class="text-center p-6 bg-gray-50 rounded-xl">
                    <i class="fa-regular fa-calendar-xmark text-5xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500 font-medium">No attendance records found</p>
                    <p class="text-xs text-gray-400 mt-1">Your attendance will appear here once marked.</p>
                    <div class="mt-4 text-xs text-left bg-amber-50 p-3 rounded-lg border border-amber-200">
                        <p class="font-bold text-amber-700 mb-1">ℹ️ Information for Teacher:</p>
                        <p>Student Name: <strong>"${studentFullName}"</strong></p>
                        ${studentGR && studentGR !== 'Pending' ? `<p>GR Number: "${studentGR}"</p>` : '<p class="text-orange-600">⚠️ No GR Number assigned (Documentation Pending)</p>'}
                        <p class="mt-2 text-gray-600">Please mark attendance by searching for the student's <strong>full name</strong> exactly as shown above.</p>
                    </div>
                </div>
            `;
            return;
        }
        
        // Calculate attendance percentage
        const totalDays = records.length;
        const percentage = Math.round((presentDays / totalDays) * 100);
        const currentMonthPercentage = currentMonthRecords.length > 0 ? 
            Math.round((currentMonthPresent / currentMonthRecords.length) * 100) : 0;
        
        logContainer.innerHTML = `
            <div class="space-y-4">
                <!-- Summary Cards -->
                <div class="grid grid-cols-2 gap-3">
                    <div class="text-center p-3 bg-green-50 rounded-xl">
                        <p class="text-2xl font-bold text-green-600">${presentDays}</p>
                        <p class="text-xs text-gray-500">Total Present</p>
                    </div>
                    <div class="text-center p-3 bg-red-50 rounded-xl">
                        <p class="text-2xl font-bold text-red-600">${absentDays}</p>
                        <p class="text-xs text-gray-500">Total Absent</p>
                    </div>
                </div>
                
                <!-- Attendance Percentage -->
                <div class="bg-blue-50 rounded-xl p-3">
                    <div class="flex justify-between text-xs mb-1">
                        <span class="text-gray-600">Overall Attendance</span>
                        <span class="font-bold text-blue-600">${percentage}%</span>
                    </div>
                    <div class="w-full bg-blue-200 rounded-full h-2">
                        <div class="bg-blue-600 h-2 rounded-full" style="width: ${percentage}%"></div>
                    </div>
                    <div class="flex justify-between text-xs mt-2">
                        <span class="text-gray-500">This Month: ${currentMonthPresent}/${currentMonthRecords.length}</span>
                        <span class="text-gray-500">${currentMonthPercentage}%</span>
                    </div>
                </div>
                
                <!-- Records List -->
                <div>
                    <div class="flex justify-between items-center mb-2">
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Attendance History</p>
                        <p class="text-[10px] text-gray-400">${records.length} records</p>
                    </div>
                    <div class="max-h-60 overflow-y-auto space-y-1 border rounded-lg divide-y">
                        ${records.slice(0, 30).map(r => `
                            <div class="flex justify-between items-center p-2 hover:bg-gray-50">
                                <div>
                                    <span class="text-xs font-medium">${formatDate(r.date)}</span>
                                    <span class="text-[10px] text-gray-400 ml-2">(${r.className})</span>
                                </div>
                                <span class="text-xs font-bold px-2 py-0.5 rounded-full ${r.status === 'Present' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}">
                                    ${r.status === 'Present' ? '✓ Present' : '✗ Absent'}
                                </span>
                            </div>
                        `).join('')}
                        ${records.length > 30 ? `<div class="text-center text-[10px] text-gray-400 p-2">+ ${records.length - 30} more records</div>` : ''}
                    </div>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error("Error fetching student logs:", error);
        logContainer.innerHTML = `
            <div class="text-center p-4 text-red-500">
                <i class="fa-solid fa-exclamation-triangle text-3xl mb-2"></i>
                <p>Error loading attendance records</p>
                <p class="text-xs mt-1">${error.message}</p>
                <button onclick="fetchPersonalStudentLogs('${studentName}')" class="mt-3 text-blue-600 text-xs underline">Try Again</button>
            </div>
        `;
    }
}

function formatDate(dateStr) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

function formatDate(dateStr) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

function displayAttendanceRecords(container, records, showAllMonths) {
    let presentDays = records.filter(r => r.status === 'Present').length;
    let absentDays = records.filter(r => r.status === 'Absent').length;
    
    container.innerHTML = `
        <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="text-center p-3 bg-green-50 rounded-xl">
                <p class="text-2xl font-bold text-green-600">${presentDays}</p>
                <p class="text-xs text-gray-500">Present</p>
            </div>
            <div class="text-center p-3 bg-red-50 rounded-xl">
                <p class="text-2xl font-bold text-red-600">${absentDays}</p>
                <p class="text-xs text-gray-500">Absent</p>
            </div>
        </div>
        ${showAllMonths ? '<div class="text-center text-xs text-orange-500 mb-2">⚠️ Showing records from all months</div>' : ''}
        <div class="text-center text-xs text-gray-400 mb-2">
            Total Records: ${records.length}
        </div>
        <div class="max-h-60 overflow-y-auto space-y-1">
            ${records.map(r => `
                <div class="flex justify-between items-center p-2 border-b hover:bg-gray-50 rounded">
                    <span class="text-xs font-medium">${formatDate(r.date)}</span>
                    <span class="text-xs font-bold px-2 py-1 rounded-full ${r.status === 'Present' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}">
                        ${r.status === 'Present' ? '✓ Present' : '✗ Absent'}
                    </span>
                </div>
            `).join('')}
        </div>
    `;
}

function formatDate(dateStr) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

// Helper function to format date
function formatDate(dateStr) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

// Helper function to format date
function formatDate(dateStr) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

// 19. HOME SUMMARY UPDATE
async function updateHomeSummary() {
    const dateKey = new Date().toISOString().split('T')[0];
    
    const [staffRes, studRes] = await Promise.all([
        fetch(TEACHER_SHEET_CSV),
        fetch(STUDENT_SHEET_CSV)
    ]);
    
    const totalStaffCount = (await staffRes.text()).split('\n').filter(r => r.trim()).length - 1;
    const totalStudentCount = (await studRes.text()).split('\n').filter(r => r.trim()).length - 1;
    
    document.getElementById('home-staff-total') && (document.getElementById('home-staff-total').innerText = totalStaffCount);
    document.getElementById('home-stud-total') && (document.getElementById('home-stud-total').innerText = totalStudentCount);
    
    firebase.database().ref('attendance/' + dateKey).on('value', (snapshot) => {
        const data = snapshot.val();
        let pStaff = 0;
        if (data) {
            const names = new Set();
            Object.values(data).forEach(log => { if(log.type.includes('IN')) names.add(log.name); });
            pStaff = names.size;
        }
        document.getElementById('home-staff-present') && (document.getElementById('home-staff-present').innerText = pStaff);
        document.getElementById('home-staff-absent') && (document.getElementById('home-staff-absent').innerText = Math.max(0, totalStaffCount - pStaff));
        document.getElementById('home-staff-bar') && (document.getElementById('home-staff-bar').style.width = (pStaff / totalStaffCount * 100) + "%");
    });
    
    firebase.database().ref('student_attendance/' + dateKey).on('value', (snapshot) => {
        const classesData = snapshot.val();
        let sPresent = 0, sAbsent = 0, totalMarked = 0;
        if (classesData) {
            Object.values(classesData).forEach(classObj => {
                if (classObj.records) {
                    Object.values(classObj.records).forEach(record => {
                        totalMarked++;
                        if (record.status === 'Present') sPresent++;
                        if (record.status === 'Absent') sAbsent++;
                    });
                }
            });
        }
        const sUnchecked = Math.max(0, totalStudentCount - totalMarked);
        document.getElementById('home-stud-present') && (document.getElementById('home-stud-present').innerText = sPresent);
        document.getElementById('home-stud-absent') && (document.getElementById('home-stud-absent').innerText = sAbsent);
        document.getElementById('home-stud-unchecked') && (document.getElementById('home-stud-unchecked').innerText = sUnchecked);
        document.getElementById('home-stud-bar-present') && (document.getElementById('home-stud-bar-present').style.width = (sPresent / totalStudentCount * 100) + "%");
        document.getElementById('home-stud-bar-absent') && (document.getElementById('home-stud-bar-absent').style.width = (sAbsent / totalStudentCount * 100) + "%");
    });
}

// 20. DOWNLOAD REPORTS
window.downloadStudentReport = () => {
    const dateKey = new Date().toISOString().split('T')[0];
    const classVal = document.getElementById('target-class')?.value;
    if (!classVal) return alert("Select a class first");
    
    firebase.database().ref(`student_attendance/${dateKey}/${classVal}/records`).once('value', async (snapshot) => {
        const records = snapshot.val();
        if (!records) return alert("No attendance data");
        
        let csvContent = "data:text/csv;charset=utf-8,GR No,Student Name,Status\n";
        Object.keys(records).forEach(grNo => {
            csvContent += `${grNo},${records[grNo].name},${records[grNo].status}\n`;
        });
        
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `Attendance_${classVal}_${dateKey}.csv`);
        link.click();
    });
};

window.downloadMonthlyReport = () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    
    firebase.database().ref('attendance').once('value', (snapshot) => {
        const allData = snapshot.val();
        if (!allData) return alert("No data found.");
        
        let csvContent = "data:text/csv;charset=utf-8,Staff Name,Total Hours\n";
        const staffHours = {};
        
        Object.keys(allData).forEach(dateStr => {
            if (dateStr.startsWith(`${year}-${month.toString().padStart(2, '0')}`)) {
                const logs = Object.values(allData[dateStr]);
                const dailyMap = {};
                logs.forEach(log => {
                    if (!staffHours[log.name]) staffHours[log.name] = 0;
                    if (log.type.includes('IN')) dailyMap[log.name] = { in: log.timestamp };
                    if (log.type.includes('OUT') && dailyMap[log.name]?.in) {
                        const diff = (log.timestamp - dailyMap[log.name].in) / 60000;
                        staffHours[log.name] += diff;
                    }
                });
            }
        });
        
        Object.keys(staffHours).forEach(name => {
            const hours = Math.floor(staffHours[name] / 60);
            const mins = Math.floor(staffHours[name] % 60);
            csvContent += `${name},${hours} hrs ${mins} mins\n`;
        });
        
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `Monthly_Report_${month}_${year}.csv`);
        link.click();
    });
};

// 21. UTILITIES
window.triggerInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
        deferredPrompt = null;
        document.getElementById('install-button-container')?.classList.add('hidden');
    }
};

// Enhanced Modern Home Dashboard
window.loadModernDashboard = (role, name, mappedClass) => {
    const content = document.getElementById('content');
    
    // Modern Welcome Card with Stats
    const welcomeCard = `
        <div class="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 text-white shadow-xl mb-6">
            <div class="flex justify-between items-start">
                <div>
                    <h2 class="text-2xl font-bold mb-1">Hello, ${name}! 👋</h2>
                    <p class="text-white/80 text-sm">${new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    ${mappedClass ? `<p class="text-white/70 text-xs mt-2"><i class="fas fa-graduation-cap mr-1"></i>Class: ${mappedClass}</p>` : ''}
                </div>
                <div class="bg-white/20 backdrop-blur rounded-full p-3">
                    <i class="fas fa-school text-2xl"></i>
                </div>
            </div>
        </div>
    `;
    
    if (["Supervisor", "Clerk", "Super Admin", "Admin", "Teacher"].includes(role)) {
        content.innerHTML = welcomeCard + `
            <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg hover-card">
                    <i class="fas fa-users text-2xl mb-2"></i>
                    <p class="text-2xl font-bold" id="staff-count">0</p>
                    <p class="text-xs opacity-90">Total Staff</p>
                </div>
                <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg hover-card">
                    <i class="fas fa-child text-2xl mb-2"></i>
                    <p class="text-2xl font-bold" id="student-count">0</p>
                    <p class="text-xs opacity-90">Total Students</p>
                </div>
            </div>
            
            <div class="grid grid-cols-1 gap-4">
                ${createModernCard("Staff Attendance", "fas fa-user-check", "blue", "staff_logs_detail", "View staff attendance records")}
                ${createModernCard("Student Attendance", "fas fa-calendar-check", "green", "student_attendance_summary", "Today's attendance status")}
                ${createModernCard("Daily Time Table", "fas fa-calendar-alt", "purple", "openDailyTimeTable", "View class schedules")}
                ${createModernCard("Exam Time Table", "fas fa-clock", "orange", "openExamTimeTable", "Exam schedule & dates")}
                ${createModernCard("Teacher Time Table", "fas fa-chalkboard-user", "indigo", "openTeacherTimeTable", "Teacher wise schedule")}
                ${createModernCard("Student Directory", "fas fa-address-book", "cyan", "loadSection", "students", "View all student details")}
                ${createModernCard("Fees Dashboard", "fas fa-credit-card", "emerald", "showFeesDashboard", "Fee collection status")}
            </div>
        `;
        updateHomeStats();
    } else if (role === 'Student') {
        content.innerHTML = welcomeCard + `
            <div class="grid grid-cols-1 gap-4">
                ${createModernCard("My Time Table", "fas fa-calendar-alt", "purple", "openDailyTimeTable", "View your class schedule")}
                ${createModernCard("Exam Schedule", "fas fa-clock", "orange", "openExamTimeTable", "Upcoming exams")}
                ${createModernCard("My Attendance", "fas fa-check-circle", "green", "loadSection", "attendance", "Your attendance record")}
                ${createModernCard("Homework", "fas fa-book-open", "blue", "loadSection", "homework", "Pending assignments")}
                ${createModernCard("Fees Status", "fas fa-credit-card", "emerald", "showFeesDashboard", "Fee payment status")}
                ${createModernCard("School Notices", "fas fa-bell", "red", "loadSection", "notices", "Latest announcements")}
            </div>
        `;
    }
    
    // Animate counters
    animateCounters();
};

function createModernCard(title, icon, color, action, param1, param2) {
    const colorMap = {
        blue: "from-blue-500 to-blue-600",
        green: "from-green-500 to-green-600",
        purple: "from-purple-500 to-purple-600",
        orange: "from-orange-500 to-orange-600",
        indigo: "from-indigo-500 to-indigo-600",
        cyan: "from-cyan-500 to-cyan-600",
        emerald: "from-emerald-500 to-emerald-600",
        red: "from-red-500 to-red-600",
        pink: "from-pink-500 to-pink-600"
    };
    
    const gradient = colorMap[color] || colorMap.blue;
    const onClick = param2 ? `${action}('${param1}', '${param2}')` : (param1 ? `${action}('${param1}')` : `${action}()`);
    
    return `
        <div onclick="${onClick}" class="bg-white rounded-xl shadow-sm hover-card cursor-pointer overflow-hidden transition-all">
            <div class="flex items-center p-4">
                <div class="bg-gradient-to-br ${gradient} rounded-xl p-3 text-white mr-4">
                    <i class="${icon} text-xl"></i>
                </div>
                <div class="flex-1">
                    <h3 class="font-bold text-gray-800">${title}</h3>
                    <p class="text-xs text-gray-500 mt-1">${param2 || "Tap to view"}</p>
                </div>
                <i class="fas fa-chevron-right text-gray-300"></i>
            </div>
        </div>
    `;
}

function animateCounters() {
    const counters = document.querySelectorAll('[id$="-count"]');
    counters.forEach(counter => {
        const target = parseInt(counter.innerText);
        if (isNaN(target)) return;
        let current = 0;
        const increment = target / 30;
        const updateCounter = () => {
            current += increment;
            if (current < target) {
                counter.innerText = Math.ceil(current);
                requestAnimationFrame(updateCounter);
            } else {
                counter.innerText = target;
            }
        };
        updateCounter();
    });
}

async function updateHomeStats() {
    try {
        const [staffRes, studRes] = await Promise.all([
            fetch(TEACHER_SHEET_CSV),
            fetch(STUDENT_SHEET_CSV)
        ]);
        const staffCount = (await staffRes.text()).split('\n').filter(r => r.trim()).length - 1;
        const studentCount = (await studRes.text()).split('\n').filter(r => r.trim()).length - 1;
        
        const staffEl = document.getElementById('staff-count');
        const studentEl = document.getElementById('student-count');
        if (staffEl) staffEl.innerText = staffCount;
        if (studentEl) studentEl.innerText = studentCount;
    } catch (e) {
        console.error("Error loading stats:", e);
    }
}
// Push Notification Configuration
const VAPID_PUBLIC_KEY = "BDEMWUO3WUNf6Dk7mDjT-IgeCC-EfEDsLY5XYZHcS2V-Tc9rFIDhQEFU1eO6ItnbB0rKiok5vdg9BH5EbLyFTK4";

// Check if browser supports notifications
let isPushNotificationSupported = false;
let isPushNotificationEnabled = false;

// Initialize push notifications
async function initPushNotifications() {
    isPushNotificationSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    
    if (!isPushNotificationSupported) {
        console.log('Push notifications not supported');
        return false;
    }
    
    // Check if already subscribed
    const subscription = await getPushSubscription();
    isPushNotificationEnabled = !!subscription;
    
    return isPushNotificationSupported;
}

// Get current push subscription
async function getPushSubscription() {
    if (!isPushNotificationSupported) return null;
    
    const swRegistration = await navigator.serviceWorker.ready;
    return await swRegistration.pushManager.getSubscription();
}

// Enable push notifications
async function enablePushNotifications() {
    if (!isPushNotificationSupported) {
        alert('Your browser does not support push notifications. Please use a modern browser like Chrome, Firefox, or Edge.');
        return false;
    }
    
    // Request permission
    let permission = Notification.permission;
    
    if (permission !== 'granted') {
        permission = await Notification.requestPermission();
    }
    
    if (permission !== 'granted') {
        alert('You denied notification permission. Please enable notifications in your browser settings to receive updates.');
        return false;
    }
    
    try {
        // Get service worker registration
        const swRegistration = await navigator.serviceWorker.ready;
        
        // Subscribe to push notifications
        const subscription = await swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        
        // Save subscription to Firebase
        const userId = localStorage.getItem('userGR') || localStorage.getItem('userPhone');
        const userRole = localStorage.getItem('userRole');
        const userName = localStorage.getItem('userName');
        
        await firebase.database().ref('push_subscriptions/' + userId).set({
            endpoint: subscription.endpoint,
            keys: subscription.toJSON().keys,
            userId: userId,
            userRole: userRole,
            userName: userName,
            subscribedAt: firebase.database.ServerValue.TIMESTAMP,
            deviceInfo: navigator.userAgent
        });
        
        isPushNotificationEnabled = true;
        
        // Update UI
        updateNotificationButtonUI(true);
        
        // Send test notification
        setTimeout(() => {
            showLocalNotification('Notifications Enabled!', 'You will now receive important school updates and announcements.');
        }, 1000);
        
        alert('✅ Push notifications enabled successfully! You will now receive important updates.');
        return true;
        
    } catch (error) {
        console.error('Push subscription error:', error);
        
        if (error.code === 20) { // AbortError
            alert('Please make sure your browser supports push notifications and try again.');
        } else if (error.name === 'InvalidStateError') {
            alert('Service worker is not ready. Please refresh the page and try again.');
        } else {
            alert('Failed to enable notifications: ' + error.message);
        }
        return false;
    }
}

// Disable push notifications
async function disablePushNotifications() {
    try {
        const subscription = await getPushSubscription();
        
        if (subscription) {
            await subscription.unsubscribe();
        }
        
        // Remove from Firebase
        const userId = localStorage.getItem('userGR') || localStorage.getItem('userPhone');
        await firebase.database().ref('push_subscriptions/' + userId).remove();
        
        isPushNotificationEnabled = false;
        updateNotificationButtonUI(false);
        
        alert('🔕 Push notifications disabled. You can re-enable them anytime.');
        return true;
        
    } catch (error) {
        console.error('Error disabling notifications:', error);
        alert('Failed to disable notifications: ' + error.message);
        return false;
    }
}

// Helper: Convert base64 to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Show local notification (for testing)
function showLocalNotification(title, body) {
    if (Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: '/Padgha Urdu High School Logo.png',
            badge: '/icons/icon-72x72.png',
            vibrate: [200, 100, 200]
        });
    }
}

// Update notification button UI
function updateNotificationButtonUI(isEnabled) {
    const notifBtn = document.getElementById('enable-notifications-btn');
    if (!notifBtn) return;
    
    const icon = notifBtn.querySelector('i');
    if (icon) {
        icon.className = isEnabled ? 'fas fa-bell' : 'fas fa-bell-slash';
    }
    const span = notifBtn.querySelector('span');
    if (span) {
        span.textContent = isEnabled ? '✅ Notifications Enabled' : '🔔 Enable Notifications';
    }
}

// Check notification status on page load
async function checkNotificationStatus() {
    await initPushNotifications();
    updateNotificationButtonUI(isPushNotificationEnabled);
}

// Send push notification to specific user (Admin function)
async function sendPushNotificationToUser(userId, title, body, type = 'notice', data = {}) {
    try {
        // Get user's subscription from Firebase
        const subscriptionSnap = await firebase.database().ref('push_subscriptions/' + userId).once('value');
        const subscription = subscriptionSnap.val();
        
        if (!subscription) {
            console.log('User not subscribed to notifications');
            return false;
        }
        
        // Call your backend API or Firebase Cloud Function
        const response = await fetch('/api/send-push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                subscription: subscription,
                title: title,
                body: body,
                type: type,
                data: data,
                timestamp: Date.now()
            })
        });
        
        return response.ok;
        
    } catch (error) {
        console.error('Error sending push notification:', error);
        return false;
    }
}

// Send push notification to all users of a specific role
async function sendPushNotificationToRole(role, title, body, type = 'notice') {
    try {
        const subscriptionsSnap = await firebase.database().ref('push_subscriptions').orderByChild('userRole').equalTo(role).once('value');
        const subscriptions = subscriptionsSnap.val();
        
        if (!subscriptions) {
            console.log(`No subscribers found for role: ${role}`);
            return false;
        }
        
        let sentCount = 0;
        
        for (const [userId, subscription] of Object.entries(subscriptions)) {
            const success = await sendPushNotificationToUser(userId, title, body, type);
            if (success) sentCount++;
        }
        
        console.log(`Sent notifications to ${sentCount} ${role}(s)`);
        return sentCount;
        
    } catch (error) {
        console.error('Error sending bulk notifications:', error);
        return 0;
    }
}

// Auto-check for due fees and send reminders (runs daily)
async function checkDueFeesAndNotify() {
    const today = new Date();
    const dayOfMonth = today.getDate();
    
    // Check on 10th day of every month
    if (dayOfMonth === 10) {
        try {
            const FEES_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvXFLMLsq-rdnjq7DGez4eDUlYupTGX9bDMOWnDF1zQifrq9r2nNISZJRT6-AaS_Pwg8RqZFbsfbMy/pub?gid=0&single=true&output=csv";
            const response = await fetch(FEES_CSV_URL);
            const data = await response.text();
            
            // Parse CSV and find users with due fees
            const rows = data.split('\n').slice(1);
            const dueFeesUsers = [];
            
            rows.forEach(row => {
                const cols = row.split(',');
                const studentName = cols[1]?.trim();
                const totalFees = parseFloat(cols[2]) || 0;
                const paidAmount = parseFloat(cols[3]) || 0;
                const balance = totalFees - paidAmount;
                
                if (balance > 0 && studentName) {
                    dueFeesUsers.push({ name: studentName, balance: balance });
                }
            });
            
            // Send notifications to due fee users
            for (const user of dueFeesUsers) {
                await sendPushNotificationToUser(
                    user.name,
                    '💰 Fee Reminder',
                    `Your fee balance of ₹${user.balance} is due. Please clear it at the earliest.`,
                    'fees',
                    { amount: user.balance }
                );
            }
            
            console.log(`Sent fee reminders to ${dueFeesUsers.length} students`);
            
        } catch (error) {
            console.error('Error checking due fees:', error);
        }
    }
}

// Schedule daily check for due fees
function scheduleDailyFeeCheck() {
    // Check immediately on login
    checkDueFeesAndNotify();
    
    // Then check every 24 hours
    setInterval(() => {
        checkDueFeesAndNotify();
    }, 24 * 60 * 60 * 1000);
}



// Add this to your app.js
window.setActiveNav = (element, section) => {
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    element.classList.add('active');
    
    // Load the section
    loadSection(section);
};
window.scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
};
window.toggleTheme = () => {
    document.body.classList.toggle('dark');
    // Save preference to localStorage
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('darkMode', isDark);
};

// Apply saved theme on load
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark');
}
function updateUserDisplay() {
    const userName = localStorage.getItem('userName');
    const userRole = localStorage.getItem('userRole');
    const userNameDisplay = document.getElementById('user-name-display');
    if (userNameDisplay && userName) {
        userNameDisplay.innerText = `${userRole} • ${userName}`;
    }
}

// Call this after login
updateUserDisplay();
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
// Toggle push notifications
window.togglePushNotifications = async () => {
    if (isPushNotificationEnabled) {
        // Ask for confirmation before disabling
        const confirm = window.confirm('Are you sure you want to disable push notifications? You will stop receiving important updates.');
        if (confirm) {
            await disablePushNotifications();
        }
    } else {
        await enablePushNotifications();
    }
};
// In app.js - keep only ONE of these
window.handleLogout = function() {
    if (confirm("Are you sure you want to logout?")) {
        // Remove items from localStorage
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('mappedClass');
        localStorage.removeItem('userPhone');
        localStorage.removeItem('userGR');
        localStorage.removeItem('hasCheckedInToday');
        localStorage.removeItem('lastActivityDate');

        // Hide main app and show login screen
        const mainApp = document.getElementById('main-app');
        const loginScreen = document.getElementById('login-screen');
        if (mainApp) mainApp.classList.add('hidden');
        if (loginScreen) loginScreen.classList.remove('hidden');
        
        // Clear the content area
        const content = document.getElementById('content');
        if (content) content.innerHTML = '';
    }
};

// Register service worker
if ('serviceWorker' in navigator) {
    (async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered');
        } catch (error) {
            console.log('Service Worker registration failed:', error);
        }
    })();
}
