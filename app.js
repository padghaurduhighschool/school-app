{

// 1. CONFIGURATION & STATE
const TEACHER_SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTtCtTy2UbnOJv3osixYzktVJK9QSUtJhSeeOmtol-efSarJWEaoNA8s-tppqTkM-jP0ZeBJ0DdGlfl/pub?gid=0&single=true&output=csv";
const STUDENT_SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS7GzBg3WiApNvwB_2QNVFuNmX4RaPmkOawPtP6MR_DZ9JJOzTuNRV2mbY4rlesK0yn5zIHYXPyjDmB/pub?gid=0&single=true&output=csv"; 
const OFFICE_LAT = 19.2435; 
const OFFICE_LON = 73.1234; 
let deferredPrompt;

let selectedStudentGR = null;

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
    const phone = document.getElementById('phone').value.trim();
    const code = document.getElementById('code').value.trim();

    try {
        // 🔹 1. Check TEACHER sheet
        const teacherRes = await fetch(TEACHER_SHEET_CSV);
        const teacherText = await teacherRes.text();
        const teacherRows = teacherText.split('\n').map(r => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/));

        let user = teacherRows.find(row => 
            row[0]?.trim() === phone && 
            row[1]?.trim() === code
        );

        if (user) {
            // ✅ STAFF LOGIN
            localStorage.setItem('userRole', user[3].trim());
            localStorage.setItem('userName', user[2].trim());
            localStorage.setItem('mappedClass', user[5] ? user[5].trim() : "");

            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('main-app').classList.remove('hidden');
            loadSection('home');
            return;
        }

        // 🔹 2. Check STUDENT sheet
const studentRes = await fetch(STUDENT_SHEET_CSV);
const studentText = await studentRes.text();

// ✅ SAFE parsing (no syntax issues)
const rows = studentText.split('\n').map(function(r) {
    return r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
});

function clean(v) {
    return v ? v.replace(/"/g, '').trim() : "";
}

// ✅ headers
const headers = rows[0].map(clean);

// ✅ map headers
const headerMap = {};
headers.forEach(function(h, i) {
    headerMap[h.toLowerCase()] = i;
});

// ✅ helper
function get(row, key) {
    const index = headerMap[key.toLowerCase()];
    return index !== undefined ? clean(row[index]) : "";
}

// ✅ build students
const students = rows.slice(1).map(function(r) {
    return {
        gr: get(r, "gr.") || get(r, "gr"),
        name: get(r, "full name"),
        class: get(r, "class"),
        phone: get(r, "contact no."),
        code: get(r, "code")
    };
});
console.log(students.slice(0,5));
// ✅ match
let student = students.find(function(s) {
    return String(s.phone).trim() === phone &&
           String(s.code).trim() === code;
});
        if (student) {
            // ✅ STUDENT LOGIN
            localStorage.setItem('userRole', 'Student');
            localStorage.setItem('userName', student.name);
            localStorage.setItem('mappedClass', student.class);
            localStorage.setItem('userGR', student.gr);

            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('main-app').classList.remove('hidden');
            loadSection('home');
            return;
        }

        // ❌ Not found
        alert("Invalid credentials. Please check phone or GR No.");

    } catch (error) {
        console.error(error);
        alert("Login failed. Check internet or CSV access.");
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

        <div >
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


<div class="grid grid-cols-1 gap-3">

    <!-- Daily -->
    <div onclick="openDailyTimeTable()" 
        class="bg-white p-5 rounded-xl shadow-sm border-t-4 border-green-500 cursor-pointer">
        <p class="text-gray-500 text-[10px] uppercase font-bold">Students View</p>
        <p class="text-xl font-bold text-green-600">Daily Time Table</p>
    </div>

    <!-- Exam -->
    <div onclick="openExamTimeTable()" 
        class="bg-white p-5 rounded-xl shadow-sm border-t-4 border-orange-500 cursor-pointer">
        <p class="text-gray-500 text-[10px] uppercase font-bold">Students View</p>
        <p class="text-xl font-bold text-orange-600">Exam Time Table</p>
    </div>

    <!-- Teacher -->
    <div onclick="openTeacherTimeTable()" 
        class="bg-white p-5 rounded-xl shadow-sm border-t-4 border-blue-500 cursor-pointer">
        <p class="text-gray-500 text-[10px] uppercase font-bold">Teachers View</p>
        <p class="text-xl font-bold text-blue-600">Teacher Time Table</p>
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
        <div class="space-y-2">
            <div id="staff-section" class="${role === 'Student' ? 'hidden' : 'space-y-2'}">
                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider">My Attendance (Staff)</h3>
                <div id="staff-controls"></div> 
            </div>

            <hr class="border-gray-100 ${role === 'Student' ? 'hidden' : ''}">

            <div id="student-section" class="space-y-2">
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
            <div class="grid grid-cols-2 gap-1">
                <button onclick="markAttendance('IN')" ${hasCheckedIn || isTooEarly ? 'disabled' : ''} 
                    class="p-4 rounded-xl font-bold text-sm ${hasCheckedIn || isTooEarly ? 'bg-gray-200 text-gray-400' : 'bg-green-500 text-white shadow-md'}">
                    ${isTooEarly ? 'Too Early' : (hasCheckedIn ? 'IN ✅' : 'Check IN')}
                </button>
                <button onclick="markAttendance('OUT')" ${!hasCheckedIn ? 'disabled' : ''} 
                    class="p-4 rounded-xl font-bold text-sm ${!hasCheckedIn ? 'bg-gray-200 text-gray-400' : 'bg-red-500 text-white shadow-md'}">
                    Check OUT
                </button>
                <div id="attendance-feedback" class="mt-2 text-center"></div>
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

// Add this inside window.loadSection = (section) => { ... }

if (section === 'staff_logs_detail') {
    content.innerHTML = `
        <div class="space-y-4">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center space-x-2">
                    <button onclick="loadSection('home')" class="p-2 bg-gray-100 rounded-full text-gray-600">←</button>
                    <h2 class="text-lg font-bold text-gray-800">Staff Logs</h2>
                </div>
                <span class="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-bold" id="log-count">0 Logs</span>
            </div>

            <div class="relative">
                <input type="text" id="staffLogSearch" onkeyup="filterStaffLogs()" 
                    placeholder="Search teacher name..." 
                    class="w-full p-3 pl-10 bg-white rounded-xl text-sm border border-gray-100 shadow-sm focus:ring-2 focus:ring-blue-500">
                <span class="absolute left-3 top-3.5 opacity-30">🔍</span>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
                <button onclick="downloadReport()" class="bg-blue-50 text-blue-600 p-3 rounded-xl text-[10px] font-bold shadow-sm active:scale-95 transition-all">
                    📥 DAILY CSV
                </button>
                <button onclick="downloadMonthlyReport()" class="bg-indigo-50 text-indigo-600 p-3 rounded-xl text-[10px] font-bold shadow-sm active:scale-95 transition-all">
                    📅 MONTHLY CSV
                </button>
            </div>

            <div id="full-staff-log-container" class="space-y-2 pb-10">
                <p class="text-center py-10 text-gray-400 italic">Loading...</p>
            </div>
        </div>
    `;
    fetchFullStaffLogs();
}

if (section === 'student_attendance_summary') {
    content.innerHTML = `
        <div class="space-y-4">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center space-x-2">
                    <button onclick="loadSection('home')" class="p-2 bg-gray-100 rounded-full text-gray-600">←</button>
                    <h2 class="text-lg font-bold text-gray-800">Class Attendance Status</h2>
                </div>
            </div>

            <div id="class-status-container" class="grid grid-cols-1 gap-3 pb-10">
                <p class="text-center py-10 text-gray-400 italic">Checking class records...</p>
            </div>
        </div>
    `;
    fetchClassAttendanceStatus();
}

if (section === 'homework') {
    const role = localStorage.getItem('userRole');
    const mappedClass = localStorage.getItem('mappedClass');
    
    content.innerHTML = `
        <div class="space-y-4">
            <h2 class="text-lg font-bold text-gray-800">Class Homework</h2>
            
            ${["Teacher", "Admin", "Super Admin", "Supervisor", "Clerk"].includes(role) ? `
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-blue-50">
                    <p class="text-[10px] font-bold text-blue-600 uppercase mb-2">Post New Homework</p>
                    <div class="space-y-3">
                        <select id="hw-target-class" class="w-full p-3 bg-gray-100 rounded-xl text-sm border-none">
                            <option value="${mappedClass}">My Class (${mappedClass})</option>
                            <option value="Jr KG">Jr KG</option>
                            <option value="Sr KG">Sr KG</option>
                            ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<option value="${n}">${n}th Std</option>`).join('')}
                        </select>
                        <input type="text" id="hw-subject" placeholder="Subject (e.g. Maths)" class="w-full p-3 bg-gray-100 rounded-xl text-sm border-none">
                        <textarea id="hw-desc" placeholder="Enter homework details..." class="w-full p-3 bg-gray-100 rounded-xl text-sm border-none h-24"></textarea>
                        <button onclick="postHomework()" class="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-md active:scale-95 transition-all">
                            Post Homework
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

    if (section === 'notices') {
    const role = localStorage.getItem('userRole');
    const userName = localStorage.getItem('userName');
    const userClass = localStorage.getItem('mappedClass');
    
    content.innerHTML = `
        <div class="space-y-4">
            <h2 class="text-lg font-bold text-gray-800">School Notices</h2>
            
            ${["Admin", "Super Admin", "Supervisor", "Clerk"].includes(role) ? `
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-orange-50">
                    <p class="text-[10px] font-bold text-orange-600 uppercase mb-2">Send Official Notice</p>
                    <div class="space-y-3">
                        <select id="notice-target-type" onchange="toggleNoticeFields()" class="w-full p-3 bg-gray-100 rounded-xl text-sm border-none">
                            <option value="school">Whole School</option>
                            <option value="class">Specific Class</option>
                            <option value="student">Specific Student (GR No)</option>
                        </select>

                        <div id="notice-target-details"></div>

                        <input type="text" id="notice-title" placeholder="Notice Title (e.g. Holiday Alert)" class="w-full p-3 bg-gray-100 rounded-xl text-sm border-none">
<div class="space-y-2">

    <textarea id="notice-body-en" 
        placeholder="English Notice..." 
        class="w-full p-3 bg-gray-100 rounded-xl text-sm border-none h-20"></textarea>

    <textarea id="notice-body-mr" 
        placeholder="मराठी सूचना..." 
        class="w-full p-3 bg-gray-100 rounded-xl text-sm border-none h-20"></textarea>

    <textarea id="notice-body-ur" 
        placeholder="اردو نوٹس..." 
        class="w-full p-3 bg-gray-100 rounded-xl text-sm border-none h-20"></textarea>

</div>                        
                        <button onclick="postNotice()" class="w-full bg-orange-500 text-white py-3 rounded-xl font-bold shadow-md active:scale-95 transition-all">
                            Send Notice
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
    


    
}    
// 6. ATTENDANCE & GEOLOCATION
window.markAttendance = async (type) => {
    // 1. Reference the buttons instead of a statusDiv
    const btnIn = document.getElementById('btn-in');
    const btnOut = document.getElementById('btn-out');
    
    const now = new Date();
    const timeNum = now.getHours() * 100 + now.getMinutes();
    
    // Visual feedback on the button itself
    const originalText = type === 'IN' ? 'Check IN' : 'Check OUT';
    if (type === 'IN' && btnIn) btnIn.innerText = "📍 Locating...";
    if (type === 'OUT' && btnOut) btnOut.innerText = "📍 Locating...";

    let statusPrefix = "";
    if (type === 'IN' && timeNum > 720) {
        statusPrefix = "[LATE] ";
    }

    navigator.geolocation.getCurrentPosition((position) => {
        const distance = calculateDistance(position.coords.latitude, position.coords.longitude, OFFICE_LAT, OFFICE_LON);
        let msg = `You are ${Math.round(distance)}m from the office.`;
        
        const proceed = (distance > 10) ? confirm(msg + "\n\nYou are outside the 10m range. Mark anyway?") : true;

        if (proceed) {
            saveToDatabase(statusPrefix + type, distance);
            
            if (type === 'IN') {
                localStorage.setItem('hasCheckedInToday', 'true');
                if (btnIn) {
                    btnIn.disabled = true;
                    btnIn.innerText = 'IN ✅';
                    btnIn.className = "py-3 rounded-xl font-bold text-sm bg-gray-100 text-gray-400";
                }
                const feedback = document.getElementById('attendance-feedback');
        if (feedback) {
            feedback.innerHTML = `
                <p class="text-[10px] text-gray-500 font-medium">
                    Checked in at <span class="text-blue-600">${timeStr}</span> 
                    at <span class="text-blue-600">${Math.round(distance)}m</span> from office.
                </p>
            `;
        }
                if (btnOut) {
                    btnOut.disabled = false;
                    btnOut.className = "py-3 rounded-xl font-bold text-sm bg-red-500 text-white shadow-md active:scale-95";
                }
            } else {
                localStorage.setItem('hasCheckedInToday', 'false');
                alert("Check OUT successful!");
                location.reload(); 
            }
        } else {
            // Reset button text if they cancel the confirm box
            if (type === 'IN' && btnIn) btnIn.innerText = 'Check IN';
            if (type === 'OUT' && btnOut) btnOut.innerText = 'Check OUT';
        }
    }, () => {
        alert("Location Access Denied. Please enable GPS.");
        if (type === 'IN' && btnIn) btnIn.innerText = 'Check IN';
        if (type === 'OUT' && btnOut) btnOut.innerText = 'Check OUT';
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
    
    // 1. Fetch Totals from CSVs
    const [staffRes, studRes] = await Promise.all([
        fetch(TEACHER_SHEET_CSV),
        fetch(STUDENT_SHEET_CSV)
    ]);
    
    const totalStaffCount = (await staffRes.text()).split('\n').filter(r => r.trim()).length - 1;
    const totalStudentCount = (await studRes.text()).split('\n').filter(r => r.trim()).length - 1;

    document.getElementById('home-staff-total').innerText = totalStaffCount;
    document.getElementById('home-stud-total').innerText = totalStudentCount;

    // 2. Staff Logic (Unchanged but ensuring it targets merged card)
    firebase.database().ref('attendance/' + dateKey).on('value', (snapshot) => {
        const data = snapshot.val();
        let pStaff = 0;
        if (data) {
            const names = new Set();
            Object.values(data).forEach(log => { if(log.type.includes('IN')) names.add(log.name); });
            pStaff = names.size;
        }
        document.getElementById('home-staff-present').innerText = pStaff;
        document.getElementById('home-staff-absent').innerText = Math.max(0, totalStaffCount - pStaff);
        document.getElementById('home-staff-bar').style.width = (pStaff / totalStaffCount * 100) + "%";
    });

    // 3. Updated Student Logic for "Unchecked"
    firebase.database().ref('student_attendance/' + dateKey).on('value', (snapshot) => {
        const classesData = snapshot.val();
        let sPresent = 0;
        let sAbsent = 0;
        let totalMarked = 0;

        if (classesData) {
            Object.values(classesData).forEach(classObj => {
                if (classObj.records) {
                    Object.values(classObj.records).forEach(record => {
                        totalMarked++; // Count every student that has been "saved"
                        if (record.status === 'Present') sPresent++;
                        else if (record.status === 'Absent') sAbsent++;
                    });
                }
            });
        }

        const sUnchecked = Math.max(0, totalStudentCount - totalMarked);

        // Update Text
        document.getElementById('home-stud-present').innerText = sPresent;
        document.getElementById('home-stud-absent').innerText = sAbsent;
        document.getElementById('home-stud-unchecked').innerText = sUnchecked;

        // Update Multi-color Progress Bar
        const pWidth = (sPresent / totalStudentCount) * 100;
        const aWidth = (sAbsent / totalStudentCount) * 100;
        document.getElementById('home-stud-bar-present').style.width = pWidth + "%";
        document.getElementById('home-stud-bar-absent').style.width = aWidth + "%";
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

let currentDayLogs = []; // Global store for filtering

window.fetchFullStaffLogs = () => {
    const dateKey = new Date().toISOString().split('T')[0];
    const container = document.getElementById('full-staff-log-container');
    const countBadge = document.getElementById('log-count');

    firebase.database().ref('attendance/' + dateKey).on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            currentDayLogs = [];
            if (container) container.innerHTML = `<div class="text-center py-10 text-gray-400">No logs today.</div>`;
            return;
        }

        // Convert to array and sort by latest activity
        currentDayLogs = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
        
        if (countBadge) countBadge.innerText = `${currentDayLogs.length} Logs`;
        renderStaffLogList(currentDayLogs);
    });
};

window.filterStaffLogs = () => {
    const term = document.getElementById('staffLogSearch').value.toLowerCase();
    const filtered = currentDayLogs.filter(log => 
        log.name.toLowerCase().includes(term)
    );
    renderStaffLogList(filtered);
};

window.renderStaffLogList = (logs) => {
    const container = document.getElementById('full-staff-log-container');
    if (!container) return;

    if (logs.length === 0) {
        container.innerHTML = `<p class="text-center py-10 text-gray-400 text-sm">No matching records found.</p>`;
        return;
    }

    container.innerHTML = logs.map(log => {
        const isOut = log.type.includes('OUT');
        const isLate = log.type.includes('[LATE]');
        const distance = typeof log.distance === 'string' ? log.distance : Math.round(log.distance) + 'm';
        
        return `
            <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full ${isOut ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'} flex items-center justify-center font-bold text-sm">
                        ${log.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p class="font-bold text-gray-800 text-sm">${log.name}</p>
                        <p class="text-[10px] text-gray-400 font-medium">
                            ${isLate ? '<span class="text-orange-500 font-bold">● LATE </span>' : ''}
                            ${distance} from office
                        </p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-black text-sm ${isOut ? 'text-red-500' : 'text-green-600'}">
                        ${log.type.replace('[LATE] ', '')}
                    </p>
                    <p class="text-[10px] text-gray-400">${log.time}</p>
                </div>
            </div>
        `;
    }).join('');
};

window.fetchClassAttendanceStatus = () => {
    const dateKey = new Date().toISOString().split('T')[0];
    const container = document.getElementById('class-status-container');
    
    // Define all classes in your school
    const allClasses = ["Jr KG", "Sr KG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

    firebase.database().ref(`student_attendance/${dateKey}`).on('value', (snapshot) => {
        const attendanceData = snapshot.val() || {};
        
        container.innerHTML = allClasses.map(className => {
            const record = attendanceData[className];
            const isMarked = !!record;
            
            return `
                <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-xl ${isMarked ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'} flex flex-col items-center justify-center">
                            <span class="text-[10px] font-bold uppercase leading-none">Class</span>
                            <span class="text-lg font-black">${className}</span>
                        </div>
                        <div>
                            <p class="font-bold text-gray-800">${isMarked ? '✅ Completed' : '⏳ Pending'}</p>
                            <p class="text-[10px] text-gray-400 font-medium">
                                ${isMarked ? `Marked by: ${record.markedBy}` : 'Waiting for teacher to submit'}
                            </p>
                        </div>
                    </div>
                    
                    <button onclick="loadAttendanceForClass('${className}')" 
                        class="px-4 py-2 rounded-lg text-xs font-bold ${isMarked ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}">
                        ${isMarked ? 'VIEW' : 'MARK'}
                    </button>
                </div>
            `;
        }).join('');
    });
};

// Helper to jump directly to that class marking sheet
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

window.postHomework = () => {
    const targetClass = document.getElementById('hw-target-class').value;
    const subject = document.getElementById('hw-subject').value;
    const desc = document.getElementById('hw-desc').value;
    const sender = localStorage.getItem('userName');

    if (!subject || !desc) return alert("Please fill in Subject and Details");

    const homeworkRef = firebase.database().ref('homework');
    homeworkRef.push({
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
    });
};

window.fetchHomework = () => {
    const role = localStorage.getItem('userRole');
    const userClass = localStorage.getItem('mappedClass'); // For students/teachers
    const container = document.getElementById('homework-list');

    firebase.database().ref('homework').orderByChild('timestamp').on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            container.innerHTML = `<p class="text-center py-10 text-gray-400">No homework posted yet.</p>`;
            return;
        }

        const hwArray = Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse();

        container.innerHTML = hwArray.map(hw => {
            // Logic: Students only see homework for their specific class. 
            // Admin/Staff see everything.
            if (role === 'Student' && hw.class !== userClass) return '';

            const canDelete = ["Super Admin", "Admin", "Supervisor", "Clerk"].includes(role);

            return `
                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative">
                    <div class="flex justify-between items-start mb-2">
                        <span class="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                            ${hw.subject}
                        </span>
                        <span class="text-[10px] text-gray-400 font-medium">${hw.date}</span>
                    </div>
                    <h3 class="font-bold text-gray-800">Class ${hw.class}</h3>
                    <p class="text-sm text-gray-600 mt-2 whitespace-pre-wrap">${hw.description}</p>
                    <p class="text-[9px] text-gray-400 mt-4 border-t pt-2 uppercase tracking-widest">Posted by ${hw.sender}</p>
                    
                    ${canDelete ? `
                        <button onclick="deleteHomework('${hw.id}')" 
                            class="absolute top-4 right-4 text-red-400 hover:text-red-600 text-xs">
                            🗑️
                        </button>
                    ` : ''}
                </div>
            `;
        }).join('');
    });
};

window.deleteHomework = (id) => {
    if (confirm("Are you sure you want to delete this homework?")) {
        firebase.database().ref(`homework/${id}`).remove()
            .then(() => alert("Deleted successfully"))
            .catch(err => alert("Error: " + err.message));
    }
};


window.toggleNoticeFields = () => {
    const type = document.getElementById('notice-target-type').value;
    const container = document.getElementById('notice-target-details');
    
    if (type === 'class') {
        container.innerHTML = `
            <select id="notice-target-value" class="w-full p-3 bg-gray-100 rounded-xl text-sm border-none mt-2">
                <option value="Jr KG">Jr KG</option>
                <option value="Sr KG">Sr KG</option>
                ${[1,2,3,4,5,6,7,8,9,10].map(n => `<option value="${n}">${n}th Std</option>`).join('')}
            </select>`;
    } else if (type === 'student') {
        container.innerHTML = `
            <div class="relative mt-2">
<input type="text" id="studentSearch" oninput="searchStudentNotice()" 
    placeholder="Search student name or GR No" 
    class="w-full p-3 bg-gray-100 rounded-xl text-sm border-none">

<div id="suggestionsBox" 
    class="bg-white border rounded-xl mt-1 max-h-40 overflow-y-auto hidden">
</div>

<input type="hidden" id="notice-target-value">

                
                <div id="student-search-results" class="absolute z-10 w-full bg-white shadow-xl rounded-xl mt-1 max-h-48 overflow-y-auto hidden border border-gray-100">
                </div>
                <input type="hidden" id="notice-target-value">
            </div>
            <div id="selected-student-badge" class="mt-2 hidden"></div>
        `;
    } else {
        container.innerHTML = '';
    }
};
    

window.postNotice = () => {
    const type = document.getElementById('notice-target-type').value;
    const targetValue = document.getElementById('notice-target-value')?.value || 'ALL';
    const title = document.getElementById('notice-title').value;

    const bodyEN = document.getElementById('notice-body-en')?.value || "";
    const bodyMR = document.getElementById('notice-body-mr')?.value || "";
    const bodyUR = document.getElementById('notice-body-ur')?.value || "";

    const sender = localStorage.getItem('userName');

    if (!title || (!bodyEN && !bodyMR && !bodyUR)) {
        return alert("Please enter at least one language message");
    }

    const noticeData = {
        targetType: type,
        targetValue: targetValue,
        title: title,
        message: {
            en: bodyEN,
            mr: bodyMR,
            ur: bodyUR
        },
        sender: sender,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        date: new Date().toLocaleDateString('en-GB')
    };

    const isEdit = window.editingNoticeId || null;

    if (isEdit) {
        firebase.database().ref('notices/' + isEdit).update(noticeData)
            .then(() => {
                alert("Notice updated!");
                window.editingNoticeId = null;
                loadSection('notices');
            });
    } else {
        firebase.database().ref('notices').push(noticeData)
            .then(() => {
                alert("Notice sent!");
                loadSection('notices');
            });
    }
};
    

    

window.fetchNotices = () => {
    const role = localStorage.getItem('userRole');
    const userName = localStorage.getItem('userName'); // Used for individual student targeting
    const userClass = localStorage.getItem('mappedClass');
    const container = document.getElementById('notices-list');

    // We fetch the student's GR No from their profile if they are a student
    // For this example, we assume their 'userName' matches their name in records, 
    // but usually, you'd store their GR No in localStorage at login.
    const userGR = localStorage.getItem('userGR') || ""; 

    firebase.database().ref('notices').orderByChild('timestamp').on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            container.innerHTML = `<p class="text-center py-10 text-gray-400">No active notices.</p>`;
            return;
        }

        const notices = Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse();

        container.innerHTML = notices.map(n => {
            // Visibility Filter
            let visible = false;
            const currentUserName = localStorage.getItem('userName'); // The student's logged-in name
            const userClass = localStorage.getItem('mappedClass');
            if (["Admin", "Super Admin", "Supervisor", "Clerk"].includes(role)) {
                visible = true; // Admins see everything
            } else {
                if (n.targetType === 'school') visible = true;
                if (n.targetType === 'class' && n.targetValue === userClass) visible = true;
                if (n.targetType === 'student' && n.targetValue === userGR) visible = true;
            }

            if (!visible) return '';

            const canManage = ["Admin", "Super Admin", "Supervisor", "Clerk"].includes(role);

            return `
                <div class="bg-white p-5 rounded-2xl border-l-4 border-orange-500 shadow-sm relative">
                    <div class="flex justify-between items-start mb-1">
                        <span class="text-[9px] font-black text-orange-600 uppercase tracking-tighter">
                            📢 ${n.targetType === 'school' ? 'Public' : n.targetValue}
                        </span>
                        <span class="text-[10px] text-gray-400">${n.date}</span>
                    </div>
                    <h3 class="font-black text-gray-800 text-sm">${n.title}</h3>
<div class="mt-2">

    <!-- Tabs -->
    <div class="flex gap-2 mb-2 text-[10px] font-bold">
        <button onclick="switchLang('${n.id}','en')" 
            class="lang-tab px-2 py-1 rounded ${getLang() === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-100'}">EN</button>
        
        <button onclick="switchLang('${n.id}','mr')" 
            class="lang-tab px-2 py-1 rounded ${getLang() === 'mr' ? 'bg-blue-600 text-white' : 'bg-gray-100'}">MR</button>
        
        <button onclick="switchLang('${n.id}','ur')" 
            class="lang-tab px-2 py-1 rounded ${getLang() === 'ur' ? 'bg-blue-600 text-white' : 'bg-gray-100'}">UR</button>
    </div>

    <!-- Message -->
<p id="msg-${n.id}" class="text-xs text-gray-600 leading-relaxed ${getLangClass()}">
${getMessageByLang(n)}
    </p>

</div>
                    <p class="text-[8px] text-gray-400 mt-3 italic">Authored by: ${n.sender}</p>
${canManage ? `
    <div class="absolute bottom-4 right-4 flex gap-2">
        <button onclick="editNotice('${n.id}')" 
            class="text-blue-400 hover:text-blue-600 text-xs">✏️</button>
        <button onclick="deleteNotice('${n.id}')" 
            class="text-gray-300 hover:text-red-500 text-xs">🗑️</button>
    </div>
` : ''}
                </div>
            `;
        }).join('');
    });
};

window.deleteNotice = (id) => {
    if (confirm("Delete this notice for everyone?")) {
        firebase.database().ref(`notices/${id}`).remove();
    }
};

window.searchStudentForNotice = () => {
    const term = document.getElementById('student-search-input').value.toLowerCase();
    const resultsDiv = document.getElementById('student-search-results');
    
    if (term.length < 2) {
        resultsDiv.classList.add('hidden');
        return;
    }

    // Filter students from your globally loaded student array
    const matches = allStudents.filter(s => 
        s.name.toLowerCase().includes(term) || s.grNo.toString().includes(term)
    ).slice(0, 10); // Show top 10 matches

    if (matches.length > 0) {
        resultsDiv.classList.remove('hidden');
        resultsDiv.innerHTML = matches.map(s => `
            <div onclick="selectStudentForNotice('${s.grNo}', '${s.name}', '${s.class}')" 
                class="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-none">
                <p class="font-bold text-xs text-gray-800">${s.name}</p>
                <p class="text-[10px] text-gray-400">GR: ${s.grNo} • Class: ${s.class}</p>
            </div>
        `).join('');
    } else {
        resultsDiv.innerHTML = `<p class="p-3 text-[10px] text-gray-400">No student found.</p>`;
    }
};

window.selectStudentForNotice = (grNo, name, className) => {
    const input = document.getElementById('student-search-input');
    const targetValue = document.getElementById('notice-target-value');
    const resultsDiv = document.getElementById('student-search-results');
    const badge = document.getElementById('selected-student-badge');

    // Set values
    targetValue.value = grNo; // Store the ID for Firebase
    input.value = name;
    resultsDiv.classList.add('hidden');

    // Show selection badge
    badge.classList.remove('hidden');
    badge.innerHTML = `
        <div class="inline-flex items-center bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold">
            Target: ${name} (${className})
            <button onclick="clearStudentSelection()" class="ml-2 font-black">✕</button>
        </div>
    `;
};

window.clearStudentSelection = () => {
    document.getElementById('student-search-input').value = '';
    document.getElementById('notice-target-value').value = '';
    document.getElementById('selected-student-badge').classList.add('hidden');
};


// 🔹 Replace this with your real student data
let students = [];

// Example: if using Firestore
async function loadStudents() {
    const snapshot = await getDocs(collection(db, "students"));
    students = snapshot.docs.map(doc => doc.data());
}

window.searchStudentNotice = () => {
    const input = document.getElementById("studentSearch");
    const box = document.getElementById("suggestionsBox");

    if (!input || !box) return;

    let value = input.value.toLowerCase();
    box.innerHTML = "";

    if (!value) {
        box.classList.add("hidden");
        return;
    }

    let filtered = allStudents.filter(s =>
        (s.name && s.name.toLowerCase().includes(value)) ||
        (s.id && s.id.toString().includes(value))
    ).slice(0, 10); // limit results

    if (filtered.length === 0) {
        box.innerHTML = `<div class="p-2 text-gray-400 text-xs">No student found</div>`;
        box.classList.remove("hidden");
        return;
    }

    filtered.forEach(student => {
        let div = document.createElement("div");
        div.className = "p-2 hover:bg-blue-50 cursor-pointer text-sm";
        div.innerHTML = `
            <b>${student.name}</b><br>
            <span class="text-xs text-gray-500">GR: ${student.id} • Class: ${student.class}</span>
        `;

        div.onclick = () => {
            input.value = student.name;
            document.getElementById("notice-target-value").value = student.id;
            box.classList.add("hidden");
        };

        box.appendChild(div);
    });

    box.classList.remove("hidden");
};

window.editNotice = (id) => {
    firebase.database().ref('notices/' + id).once('value', (snapshot) => {
        const n = snapshot.val();
        if (!n) return;

        // Switch to notice tab
        loadSection('notices');

        setTimeout(() => {
            // Fill fields
            document.getElementById('notice-title').value = n.title || "";

            document.getElementById('notice-body-en').value = n.message?.en || "";
            document.getElementById('notice-body-mr').value = n.message?.mr || "";
            document.getElementById('notice-body-ur').value = n.message?.ur || "";

            document.getElementById('notice-target-type').value = n.targetType;
            toggleNoticeFields();

            setTimeout(() => {
                if (n.targetType !== 'school') {
                    document.getElementById('notice-target-value').value = n.targetValue;
                }
            }, 100);

            // Store edit ID
            window.editingNoticeId = id;

            // Change button text
            const btn = document.querySelector('#notices button[onclick="postNotice()"]');
            if (btn) btn.innerText = "Update Notice";
        }, 300);
    });
};

function getLang() {
    return localStorage.getItem('noticeLang') || 'en';
}

function getMessageByLang(n) {
    const lang = getLang();
    return n.message?.[lang] || n.message?.en || "No content";
}
window.switchLang = (id, lang) => {
    localStorage.setItem('noticeLang', lang);

    firebase.database().ref('notices/' + id).once('value', (snapshot) => {
        const n = snapshot.val();
        const msgDiv = document.getElementById(`msg-${id}`);
        if (msgDiv) {
            msgDiv.innerText = n.message?.[lang] || n.message?.en || "No content";

            // update font class
            msgDiv.className = `text-xs text-gray-600 leading-relaxed ${getLangClass()}`;
        }
    });

    loadSection('notices');
};

    function getLangClass() {
    const lang = getLang();
    if (lang === 'mr') return 'lang-mr';
    if (lang === 'ur') return 'lang-ur';
    return 'lang-en';
}

window.openTimeTableManager = (type) => {
    const content = document.getElementById('content');
    
    // Determine the visibility checkbox label based on type
    const visibilityLabel = (type === "Teacher Time Table") 
        ? "Visible to Teachers" 
        : "Visible to Students";

    content.innerHTML = `
        <div class="space-y-4">
            <button onclick="loadSection('home')" class="text-blue-600 font-bold flex items-center">
                ← Back to Dashboard
            </button>
            
            <div class="bg-white p-6 rounded-2xl shadow-lg border border-blue-50">
                <h2 class="text-xl font-bold text-gray-800 mb-4">${type} Settings</h2>
                
                <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">CSV Google Sheet Link</label>
                <input type="text" id="csv-url-input" placeholder="Paste published CSV link here..." 
                    class="w-full p-3 bg-gray-50 rounded-xl text-sm border focus:ring-2 focus:ring-blue-500 mb-4">
                
                <div class="flex items-center mb-6">
                    <input type="checkbox" id="visibility-check" class="w-5 h-5 text-blue-600 rounded">
                    <label for="visibility-check" class="ml-2 text-sm font-medium text-gray-700">${visibilityLabel}</label>
                </div>

                <div class="flex gap-2">
                    <button onclick="previewCSV('${type}')" class="flex-1 bg-gray-800 text-white p-3 rounded-xl font-bold">Preview</button>
                    <button onclick="saveTimeTableSettings('${type}')" class="flex-1 bg-blue-600 text-white p-3 rounded-xl font-bold">Save & Publish</button>
                </div>
            </div>

            <div id="preview-container" class="mt-4 overflow-x-auto">
                </div>
        </div>
    `;

    // Optionally: Pre-load existing data from Firebase if available
    firebase.database().ref('settings/timetables/' + type.replace(/ /g, '_')).once('value', (snap) => {
        const data = snap.val();
        if(data) {
            document.getElementById('csv-url-input').value = data.url || "";
            document.getElementById('visibility-check').checked = data.visible || false;
        }
    });
};

window.previewCSV = async (type) => {
    const url = document.getElementById('csv-url-input').value;
    const container = document.getElementById('preview-container');
    
    if(!url) return alert("Please paste a link first.");
    
    container.innerHTML = `<p class="text-center italic text-gray-500">Fetching preview...</p>`;

    try {
        const response = await fetch(url);
        const text = await response.text();
        const rows = text.split('\n').map(row => row.split(','));
        
        let tableHtml = `<table class="w-full bg-white text-xs border rounded-lg">`;
        rows.forEach((row, index) => {
            tableHtml += `<tr class="${index === 0 ? 'bg-gray-100 font-bold' : 'border-t'}">`;
            row.forEach(cell => {
                tableHtml += `<td class="p-2 border-r">${cell}</td>`;
            });
            tableHtml += `</tr>`;
        });
        tableHtml += `</table>`;
        
        container.innerHTML = tableHtml;
    } catch (e) {
        container.innerHTML = `<p class="text-red-500">Error: Could not fetch CSV. Ensure the sheet is "Published to Web" as CSV.</p>`;
    }
};

window.saveTimeTableSettings = (type) => {
    const url = document.getElementById('csv-url-input').value;
    const isVisible = document.getElementById('visibility-check').checked;
    const dbKey = type.replace(/ /g, '_');

    firebase.database().ref('settings/timetables/' + dbKey).set({
        url: url,
        visible: isVisible,
        updatedBy: localStorage.getItem('userName'),
        timestamp: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        alert(`${type} updated successfully!`);
    });
};
window.openDailyTimeTable = () => {
    const content = document.getElementById('content');

    const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const periods = 8;

    let html = `
    <div class="space-y-4">
        <button onclick="loadSection('home')" class="text-blue-600 font-bold">← Back</button>

        <div class="bg-white p-4 rounded-xl shadow">
            <h2 class="font-bold mb-3">Daily Time Table</h2>

            <select id="class-select" class="w-full p-2 border rounded mb-3">
                <option value="">Select Class</option>
                <option>Class 1</option>
                <option>Class 2</option>
                <option>Class 3</option>
            </select>

            <div class="overflow-x-auto">
            <table class="w-full text-xs border border-collapse">

                <tr class="bg-gray-100">
                    <th class="border p-2">Sr.</th>
    `;

    days.forEach(d => html += `<th class="border p-2">${d}</th>`);
    html += `</tr>`;

    for (let i=1;i<=periods;i++){
        html += `<tr>
            <td class="border p-2 text-center font-bold">${i}</td>`;

        days.forEach(d=>{
            html += `<td class="border p-1">
                <input id="d-${i}-${d}" class="w-full text-xs p-1" />
            </td>`;
        });

        html += `</tr>`;
    }

    html += `
            </table>
            </div>

            <textarea id="daily-note" placeholder="Note..." 
                class="w-full mt-3 p-2 border rounded text-sm"></textarea>

            <button onclick="saveDaily()" class="mt-3 w-full bg-blue-600 text-white p-2 rounded">
                Save
            </button>
        </div>
    </div>`;

    content.innerHTML = html;
};

window.saveDaily = () => {
    const cls = document.getElementById("class-select").value;
    if(!cls) return alert("Select class");

    const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    let data = {};

    for(let i=1;i<=8;i++){
        data[i] = {};
        days.forEach(d=>{
            data[i][d] = document.getElementById(`d-${i}-${d}`).value || "";
        });
    }

    firebase.database().ref("timetable/daily/"+cls).set({
        data,
        note: document.getElementById("daily-note").value
    });

    alert("Saved");
};

window.openExamTimeTable = () => {
    const content = document.getElementById('content');

    let html = `
    <div class="space-y-4">
        <button onclick="loadSection('home')" class="text-blue-600 font-bold">← Back</button>

        <div class="bg-white p-4 rounded-xl shadow">
            <h2 class="font-bold mb-3">Exam Time Table</h2>

            <select id="exam-class" class="w-full p-2 border rounded mb-3">
                <option value="">Select Class</option>
                <option>Class 1</option>
                <option>Class 2</option>
            </select>

            <table class="w-full text-xs border border-collapse">
                <tr class="bg-gray-100">
                    <th class="border p-2">Date</th>
                    <th class="border p-2">Day</th>
                    <th class="border p-2">Time</th>
                    <th class="border p-2">Subject</th>
                </tr>
    `;

    for(let i=1;i<=12;i++){
        html += `
        <tr>
            <td class="border p-1"><input id="ex-date-${i}" class="w-full"></td>
            <td class="border p-1"><input id="ex-day-${i}" class="w-full"></td>
            <td class="border p-1"><input id="ex-time-${i}" class="w-full"></td>
            <td class="border p-1"><input id="ex-sub-${i}" class="w-full"></td>
        </tr>`;
    }

    html += `
            </table>

            <textarea id="exam-note" placeholder="Note..." 
                class="w-full mt-3 p-2 border rounded text-sm"></textarea>

            <button onclick="saveExam()" class="mt-3 w-full bg-blue-600 text-white p-2 rounded">
                Save
            </button>
        </div>
    </div>`;

    content.innerHTML = html;
};
window.saveExam = () => {
    const cls = document.getElementById("exam-class").value;
    if(!cls) return alert("Select class");

    let rows = [];

    for(let i=1;i<=12;i++){
        rows.push({
            date: document.getElementById(`ex-date-${i}`).value,
            day: document.getElementById(`ex-day-${i}`).value,
            time: document.getElementById(`ex-time-${i}`).value,
            subject: document.getElementById(`ex-sub-${i}`).value
        });
    }

    firebase.database().ref("timetable/exam/"+cls).set({
        rows,
        note: document.getElementById("exam-note").value
    });

    alert("Saved");
};
window.openTeacherTimeTable = async () => {
    const content = document.getElementById('content');

    // Example teacher list (replace with CSV fetch)
    const teachers = ["Sir A","Sir B","Madam C"];

    const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

    let html = `
    <div class="space-y-4">
        <button onclick="loadSection('home')" class="text-blue-600 font-bold">← Back</button>

        <div class="bg-white p-4 rounded-xl shadow">
            <h2 class="font-bold mb-3">Teacher Time Table</h2>

            <select id="teacher-select" class="w-full p-2 border rounded mb-3">
                <option value="">Select Teacher</option>
    `;

    teachers.forEach(t=>{
        html += `<option>${t}</option>`;
    });

    html += `</select>

    <table class="w-full text-xs border border-collapse">
        <tr class="bg-gray-100">
            <th class="border p-2">Sr.</th>`;

    days.forEach(d=> html+= `<th class="border p-2">${d}</th>`);
    html += `</tr>`;

    for(let i=1;i<=8;i++){
        html += `<tr><td class="border p-2">${i}</td>`;
        days.forEach(d=>{
            html += `<td class="border p-1">
                <input id="t-${i}-${d}" class="w-full text-xs">
            </td>`;
        });
        html += `</tr>`;
    }

    html += `
    </table>

    <button onclick="saveTeacher()" class="mt-3 w-full bg-blue-600 text-white p-2 rounded">
        Save
    </button>
    </div></div>`;

    content.innerHTML = html;
};    
window.saveTeacher = () => {
    const teacher = document.getElementById("teacher-select").value;
    if(!teacher) return alert("Select teacher");

    const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    let data = {};

    for(let i=1;i<=8;i++){
        data[i]={};
        days.forEach(d=>{
            data[i][d] = document.getElementById(`t-${i}-${d}`).value || "";
        });
    }

    firebase.database().ref("timetable/teacher/"+teacher).set(data);

    alert("Saved");
};

    




    
    

    


    
}

