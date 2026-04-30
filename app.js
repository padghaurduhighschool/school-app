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
            updateHomeSummary();
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
        content.innerHTML = `
            <div class="bg-white rounded-2xl shadow-sm p-4 space-y-4">
                <div class="border-b pb-4">
                    <p class="font-bold text-lg text-blue-600">${localStorage.getItem('userName')} (${role})</p>
                    <p class="text-xs text-gray-500">📞 ${localStorage.getItem('userPhone')}</p>
                </div>

                <div class="p-0 grid grid-cols-2 gap-4">
                    <button onclick="showFeesChart()" class="flex flex-col items-center p-4 bg-blue-50 border border-blue-100 rounded-2xl shadow-sm active:scale-95 transition-all">
                        <i class="fa-solid fa-chart-line text-2xl text-blue-600 mb-2"></i>
                        <span class="text-sm font-bold text-blue-700">Fees Chart</span>
                    </button>
                    
                    <button onclick="calculateMonthlyHours()" class="flex flex-col items-center p-4 bg-purple-50 border border-purple-100 rounded-2xl shadow-sm active:scale-95 transition-all">
                        <i class="fa-regular fa-clock text-2xl text-purple-600 mb-2"></i>
                        <span class="text-sm font-bold text-purple-700">Monthly Hours</span>
                    </button>
                </div>

                <div id="install-button-container" class="${deferredPrompt ? '' : 'hidden'}">
                    <button onclick="triggerInstall()" class="w-full bg-blue-600 text-white p-5 rounded-2xl font-bold flex items-center justify-between shadow-md">
                        <span><i class="fa-solid fa-download mr-2"></i>Install App on Phone</span>
                        <span class="text-xs bg-white text-blue-600 px-2 py-1 rounded">INSTALL</span>
                    </button>
                </div>

                <button onclick="handleLogout()" class="w-full bg-red-50 text-red-600 p-5 rounded-2xl font-bold flex items-center justify-center border border-red-100 shadow-sm active:bg-red-100">
                    <i class="fa-solid fa-sign-out-alt mr-2"></i> Logout from System
                </button>
            </div>
        `;
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

// 12. ATTENDANCE SHEET LOADING
window.loadAttendanceSheet = async () => {
    const classVal = document.getElementById('target-class').value;
    const container = document.getElementById('attendance-sheet-container');
    const dateKey = new Date().toISOString().split('T')[0];
    
    if (!classVal) {
        alert("Please select a class first");
        return;
    }

    container.innerHTML = `<p class="text-center py-5 text-gray-400">Loading students...</p>`;

    try {
        const snapshot = await firebase.database().ref(`student_attendance/${dateKey}/${classVal}/records`).once('value');
        const existingRecords = snapshot.val() || {};

        const response = await fetch(STUDENT_SHEET_CSV);
        const text = await response.text();
        const rows = text.split('\n').slice(1);
        
        const classStudents = rows.map(row => {
            const cols = row.split(',');
            return {
                id: cols[2]?.replace(/"/g, '').trim(),
                name: cols[7]?.replace(/"/g, '').trim(),
                class: cols[1]?.replace(/"/g, '').trim()
            };
        }).filter(s => s.class === classVal && s.name);

        if (classStudents.length === 0) {
            container.innerHTML = `<p class="text-center py-5 text-red-500">No students found for "${classVal}".</p>`;
            return;
        }

        let html = `<div class="bg-white rounded-2xl shadow-sm border overflow-hidden"><div class="max-h-96 overflow-y-auto">`;
        classStudents.forEach((s, index) => {
            const studentKey = s.id || `UNKNOWN_${index}`;
            const isPresent = existingRecords[studentKey]?.status === 'Present';
            html += `
                <div class="flex justify-between items-center p-4 border-b">
                    <div>
                        <p class="text-sm font-bold text-gray-800">${s.name}</p>
                        <p class="text-[10px] text-gray-400">GR: ${s.id}</p>
                    </div>
                    <input type="checkbox" ${isPresent ? 'checked' : ''} value="${studentKey}" data-name="${s.name}" class="attendance-checkbox w-5 h-5 rounded border-gray-300 text-blue-600">
                </div>
            `;
        });
        html += `</div><div class="p-4 bg-gray-50"><button onclick="submitStudentAttendance('${classVal}')" class="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">Update Attendance</button></div></div>`;
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = `<p class="text-red-500 p-4">Error loading attendance.</p>`;
    }
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
        attendanceData[cb.value] = {
            name: cb.getAttribute('data-name'),
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

function fetchClassAttendanceStatus() {
    const dateKey = new Date().toISOString().split('T')[0];
    const container = document.getElementById('class-status-container');

    firebase.database().ref(`student_attendance/${dateKey}`).on('value', (snapshot) => {
        const attendanceData = snapshot.val() || {};
        
        container.innerHTML = schoolClasses.map(className => {
            const record = attendanceData[className];
            const isMarked = !!record;
            return `
                <div class="bg-white p-4 rounded-2xl border shadow-sm flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-xl ${isMarked ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'} flex flex-col items-center justify-center">
                            <span class="text-[10px] font-bold">Class</span>
                            <span class="text-lg font-black">${className}</span>
                        </div>
                        <div>
                            <p class="font-bold text-gray-800">${isMarked ? '✅ Completed' : '⏳ Pending'}</p>
                            <p class="text-[10px] text-gray-400">${isMarked ? `By: ${record.markedBy}` : 'Waiting for teacher'}</p>
                        </div>
                    </div>
                    <button onclick="loadAttendanceForClass('${className}')" class="px-4 py-2 rounded-lg text-xs font-bold ${isMarked ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}">
                        ${isMarked ? 'VIEW' : 'MARK'}
                    </button>
                </div>
            `;
        }).join('');
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
        const periods = ["1", "2", "3", "4", "5", "6", "7", "8"];

        let html = '<div class="overflow-x-auto"><table class="w-full text-left border-collapse"><tr class="bg-gray-50"><th class="p-2 border text-xs">Period</th>';
        days.forEach(d => html += `<th class="p-2 border text-xs">${d.substring(0,3)}</th>`);
        html += `</tr>`;
        
        periods.forEach(p => {
            html += `<tr><td class="p-2 border bg-gray-50 font-bold text-blue-600 text-center text-xs">${p}</td>`;
            days.forEach(d => {
                const value = (data[d] && data[d][p]) ? data[d][p] : "";
                if (isAdmin) {
                    html += `<td class="p-1 border"><input type="text" id="cell-${d}-${p}" value="${value}" class="w-full p-1 text-xs border-none focus:bg-yellow-50" placeholder="-"></td>`;
                } else {
                    html += `<td class="p-2 border text-xs text-gray-700">${value || '-'}</td>`;
                }
            });
            html += `</tr>`;
        });
        html += `</table></div>`;
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
    const periods = ["1", "2", "3", "4", "5", "6", "7", "8"];
    const timetableData = {};
    
    days.forEach(d => {
        timetableData[d] = {};
        periods.forEach(p => {
            const cell = document.getElementById(`cell-${d}-${p}`);
            if (cell) timetableData[d][p] = cell.value.trim();
        });
    });
    
    try {
        await firebase.database().ref("timetable/class/" + className).set(timetableData);
        alert(`Timetable for Class ${className} saved!`);
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

window.openTeacherTimeTable = () => {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="space-y-4">
            <button onclick="loadSection('home')" class="text-blue-600 font-bold"><i class="fa-solid fa-arrow-left mr-1"></i>Back</button>
            <div class="bg-white p-4 rounded-xl shadow">
                <h2 class="font-bold mb-3">Teacher Time Table</h2>
                <select id="teacherSelect" class="w-full p-2 border rounded mb-3">
                    <option value="">Select Teacher</option>
                </select>
                <div id="teacher-tt-container"></div>
                <button onclick="saveTeacherTimetable()" class="w-full mt-3 bg-purple-600 text-white p-3 rounded-xl font-bold">Save Timetable</button>
            </div>
        </div>
    `;
    loadTeacherDropdown();
};

async function loadTeacherDropdown() {
    try {
        const res = await fetch(TEACHER_SHEET_CSV);
        const text = await res.text();
        const rows = text.split('\n').slice(1);
        const teachers = rows.map(row => {
            const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            return cols[2]?.replace(/"/g, '').trim();
        }).filter(t => t);
        
        const select = document.getElementById('teacherSelect');
        select.innerHTML = '<option value="">Select Teacher</option>' + teachers.map(t => `<option value="${t}">${t}</option>`).join('');
        select.onchange = () => loadTeacherTimetable(select.value);
    } catch (e) {
        console.error(e);
    }
}

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
        schedule[day] = document.getElementById(`tt-${day}`)?.value || "";
    });
    
    const key = teacher.toLowerCase().replace(/\s+/g, '_');
    firebase.database().ref('teacher_timetables/' + key).set({
        displayName: teacher,
        schedule: schedule,
        updatedBy: localStorage.getItem('userName'),
        timestamp: firebase.database.ServerValue.TIMESTAMP
    }).then(() => alert("Timetable saved!"));
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

// 18. PERSONAL STUDENT LOGS
async function fetchPersonalStudentLogs(studentName) {
    const logContainer = document.getElementById('personal-logs');
    if (!logContainer) return;
    
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const snapshot = await firebase.database().ref('student_attendance').once('value');
    const allData = snapshot.val();
    
    let presentDays = 0, absentDays = 0;
    let records = [];
    
    Object.keys(allData || {}).forEach(dateStr => {
        if (dateStr.startsWith(`${year}-${month.toString().padStart(2, '0')}`)) {
            Object.values(allData[dateStr] || {}).forEach(classData => {
                Object.values(classData.records || {}).forEach(record => {
                    if (record.name === studentName) {
                        records.push({ date: dateStr, status: record.status });
                        if (record.status === 'Present') presentDays++;
                        if (record.status === 'Absent') absentDays++;
                    }
                });
            });
        }
    });
    
    logContainer.innerHTML = `
        <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="text-center p-3 bg-green-50 rounded-xl"><p class="text-2xl font-bold text-green-600">${presentDays}</p><p class="text-xs text-gray-500">Present</p></div>
            <div class="text-center p-3 bg-red-50 rounded-xl"><p class="text-2xl font-bold text-red-600">${absentDays}</p><p class="text-xs text-gray-500">Absent</p></div>
        </div>
        <div class="max-h-60 overflow-y-auto">${records.map(r => `<div class="flex justify-between p-2 border-b"><span class="text-xs">${r.date}</span><span class="text-xs font-bold ${r.status === 'Present' ? 'text-green-600' : 'text-red-600'}">${r.status}</span></div>`).join('')}</div>
    `;
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

window.handleLogout = () => {
    if (confirm("Sign out?")) {
        localStorage.clear();
        location.reload();
    }
};
