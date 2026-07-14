import type {
  AdminAccount,
  Assignment,
  AuditLog,
  Book,
  BookLoan,
  BusRoute,
  BusStop,
  BusLiveStatus,
  Certificate,
  ClassSession,
  Complaint,
  Department,
  Exam,
  ExamResult,
  FacultyMember,
  FeeInvoice,
  HodCandidate,
  HostelAllocation,
  HostelBlock,
  HostelRoom,
  LeaveRequest,
  Material,
  NotificationItem,
  PlacementApplication,
  PlacementOpening,
  PlatformUser,
  Program,
  Quiz,
  Section,
  Semester,
  Student,
  Subject,
  EventItem,
} from './types';

// Same fictional college as the sibling mobile app + Django backend seed_demo — same names/emails
// so this console reads as the same institution once wired to the real API.

const NAVY = '#13327F';
const PURPLE = '#7C3AED';
const TEAL = '#0D9488';
const WARNING = '#EA8A00';
const PINK = '#DB2777';
const INFO = '#0EA5E9';

function offsetDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

function offsetDate(n: number): string {
  return offsetDays(n).slice(0, 10);
}

export const adminAccounts: AdminAccount[] = [
  { id: 'usr-admin', name: 'Campus Admin', email: 'admin@campus.edu.in', role: 'admin', avatarColor: INFO },
  { id: 'usr-superadmin', name: 'System Super Admin', email: 'superadmin@campus.edu.in', role: 'superadmin', avatarColor: NAVY },
];

// Eligible HOD picks — mirrors the real backend's GET /api/v1/departments/hod-candidates
// (faculty + existing HODs). Department.hod stores one of these ids, matching the real
// POST /api/v1/departments/ payload shape ({code, name, hod: "<uuid-of-faculty-user>"}).
export const hodCandidates: HodCandidate[] = [
  { id: 'hodc-suresh', fullName: 'Dr. Suresh Pillai', email: 'suresh.pillai@campus.edu.in', role: 'hod' },
  { id: 'hodc-meera', fullName: 'Dr. Meera Iyer', email: 'meera.iyer@campus.edu.in', role: 'hod' },
  { id: 'hodc-vinod', fullName: 'Dr. Vinod Kumar', email: 'vinod.kumar@campus.edu.in', role: 'hod' },
  { id: 'hodc-latha', fullName: 'Dr. Latha Menon', email: 'latha.menon@campus.edu.in', role: 'hod' },
  { id: 'hodc-arjun', fullName: 'Dr. Arjun Nair', email: 'arjun.nair@campus.edu.in', role: 'hod' },
  { id: 'hodc-rajesh', fullName: 'Dr. Rajesh Menon', email: 'rajesh.menon@campus.edu.in', role: 'faculty' },
  { id: 'hodc-anita', fullName: 'Prof. Anita Nair', email: 'anita.nair@campus.edu.in', role: 'faculty' },
  { id: 'hodc-priya', fullName: 'Dr. Priya Verghese', email: 'priya.verghese@campus.edu.in', role: 'faculty' },
];

export const departments: Department[] = [
  { id: 'dept-cse', code: 'CSE', name: 'Computer Science & Engineering', hod: 'hodc-suresh' },
  { id: 'dept-ece', code: 'ECE', name: 'Electronics & Communication', hod: 'hodc-meera' },
  { id: 'dept-mech', code: 'MECH', name: 'Mechanical Engineering', hod: 'hodc-vinod' },
  { id: 'dept-civil', code: 'CIVIL', name: 'Civil Engineering', hod: 'hodc-latha' },
  { id: 'dept-mba', code: 'MBA', name: 'Business Administration', hod: 'hodc-arjun' },
];

// Program == the real backend's "program" resource (was called "Course" before Tab-2 wiring).
export const programs: Program[] = [
  { id: 'prog-cse', code: 'BT-CSE', name: 'B.Tech Computer Science', departmentId: 'dept-cse', durationYears: 4, intake: 120, color: NAVY },
  { id: 'prog-ece', code: 'BT-ECE', name: 'B.Tech Electronics & Comm.', departmentId: 'dept-ece', durationYears: 4, intake: 90, color: INFO },
  { id: 'prog-mech', code: 'BT-MECH', name: 'B.Tech Mechanical', departmentId: 'dept-mech', durationYears: 4, intake: 60, color: WARNING },
  { id: 'prog-civil', code: 'BT-CIVIL', name: 'B.Tech Civil', departmentId: 'dept-civil', durationYears: 4, intake: 60, color: TEAL },
  { id: 'prog-mba', code: 'MBA', name: 'Master of Business Admin.', departmentId: 'dept-mba', durationYears: 2, intake: 60, color: PINK },
];

// Semesters 1..8 (or 1..4 for the 2-year MBA) per program, generated deterministically.
export const semesters: Semester[] = programs.flatMap((p) => {
  const count = p.durationYears * 2;
  return Array.from({ length: count }, (_, i) => ({ id: `sem-${p.id}-${i + 1}`, programId: p.id, number: i + 1 }));
});

export function semesterId(programId: string, number: number): string {
  return `sem-${programId}-${number}`;
}

// Section A for every semester; CSE semester 5 additionally gets Section B (matches the
// existing seeded roster, which has always had two sections there).
export const sections: Section[] = semesters.flatMap((s) => {
  const rows: Section[] = [{ id: `sec-${s.id}-a`, semesterId: s.id, name: 'A' }];
  if (s.programId === 'prog-cse' && s.number === 5) {
    rows.push({ id: `sec-${s.id}-b`, semesterId: s.id, name: 'B' });
  }
  return rows;
});

export function sectionId(programId: string, number: number, name: 'A' | 'B' = 'A'): string {
  return `sec-${semesterId(programId, number)}-${name.toLowerCase()}`;
}

export const CORE_SUBJECT_IDS = ['sub-ds', 'sub-dbms', 'sub-os', 'sub-maths', 'sub-phy', 'sub-cn'];

const CSE_SEM5 = semesterId('prog-cse', 5);
const ECE_SEM5 = semesterId('prog-ece', 5);

export const subjects: Subject[] = [
  { id: 'sub-ds', code: 'CS301', name: 'Data Structures', credits: 4, departmentId: 'dept-cse', semesterId: CSE_SEM5, facultyId: 'fac-rajesh', facultyName: 'Dr. Rajesh Menon', color: NAVY },
  { id: 'sub-dbms', code: 'CS302', name: 'Database Management Systems', credits: 4, departmentId: 'dept-cse', semesterId: CSE_SEM5, facultyId: 'fac-anita', facultyName: 'Prof. Anita Nair', color: PURPLE },
  { id: 'sub-os', code: 'CS303', name: 'Operating Systems', credits: 4, departmentId: 'dept-cse', semesterId: CSE_SEM5, facultyId: 'fac-rajesh', facultyName: 'Dr. Rajesh Menon', color: TEAL },
  { id: 'sub-maths', code: 'MA301', name: 'Mathematics III', credits: 3, departmentId: 'dept-cse', semesterId: CSE_SEM5, facultyId: 'fac-priya', facultyName: 'Dr. Priya Verghese', color: WARNING },
  { id: 'sub-phy', code: 'PH301', name: 'Physics Lab', credits: 1, departmentId: 'dept-cse', semesterId: CSE_SEM5, facultyId: 'fac-priya', facultyName: 'Dr. Priya Verghese', color: INFO },
  { id: 'sub-cn', code: 'CS304', name: 'Computer Networks', credits: 3, departmentId: 'dept-cse', semesterId: CSE_SEM5, facultyId: 'fac-anita', facultyName: 'Prof. Anita Nair', color: PINK },
  { id: 'sub-ec1', code: 'EC301', name: 'Digital Signal Processing', credits: 4, departmentId: 'dept-ece', semesterId: ECE_SEM5, facultyId: 'fac-meera', facultyName: 'Dr. Meera Iyer', color: INFO },
];

export const students: Student[] = [
  // students[0] is the anchor demo student (guarded — cannot be removed), matches the mobile app + backend.
  { id: 'stu-abin', name: 'Abin Thomas', rollNo: 'CSE21-014', admissionNo: 'ADM2021014', email: 'abin.thomas@campus.edu.in', phone: '+91 98470 12345', departmentId: 'dept-cse', programId: 'prog-cse', semesterId: CSE_SEM5, sectionId: sectionId('prog-cse', 5, 'A'), year: 3, cgpa: 8.4, avatarColor: NAVY, mentorName: 'Dr. Rajesh Menon', bloodGroup: 'O+', gender: 'Male', dob: '2003-04-12' },
  { id: 'stu-002', name: 'Meera Pillai', rollNo: 'CSE21-002', admissionNo: 'ADM2021002', email: 'meera.pillai@campus.edu.in', phone: '+91 98470 20002', departmentId: 'dept-cse', programId: 'prog-cse', semesterId: CSE_SEM5, sectionId: sectionId('prog-cse', 5, 'A'), year: 3, cgpa: 9.1, avatarColor: PURPLE, mentorName: 'Dr. Rajesh Menon', bloodGroup: 'A+', gender: 'Female', dob: '2003-01-22' },
  { id: 'stu-003', name: 'Rohan Nair', rollNo: 'CSE21-003', admissionNo: 'ADM2021003', email: 'rohan.nair@campus.edu.in', phone: '+91 98470 20003', departmentId: 'dept-cse', programId: 'prog-cse', semesterId: CSE_SEM5, sectionId: sectionId('prog-cse', 5, 'A'), year: 3, cgpa: 7.6, avatarColor: TEAL, mentorName: 'Prof. Anita Nair', bloodGroup: 'B+', gender: 'Male', dob: '2003-09-05' },
  { id: 'stu-004', name: 'Anjali Varma', rollNo: 'CSE21-004', admissionNo: 'ADM2021004', email: 'anjali.varma@campus.edu.in', phone: '+91 98470 20004', departmentId: 'dept-cse', programId: 'prog-cse', semesterId: CSE_SEM5, sectionId: sectionId('prog-cse', 5, 'B'), year: 3, cgpa: 8.9, avatarColor: PINK, mentorName: 'Prof. Anita Nair', bloodGroup: 'AB+', gender: 'Female', dob: '2003-06-18' },
  { id: 'stu-005', name: 'Karthik Suresh', rollNo: 'CSE21-005', admissionNo: 'ADM2021005', email: 'karthik.suresh@campus.edu.in', phone: '+91 98470 20005', departmentId: 'dept-cse', programId: 'prog-cse', semesterId: CSE_SEM5, sectionId: sectionId('prog-cse', 5, 'B'), year: 3, cgpa: 6.9, avatarColor: WARNING, mentorName: 'Dr. Rajesh Menon', bloodGroup: 'O-', gender: 'Male', dob: '2003-11-30' },
  { id: 'stu-006', name: 'Divya Krishnan', rollNo: 'CSE21-006', admissionNo: 'ADM2021006', email: 'divya.krishnan@campus.edu.in', phone: '+91 98470 20006', departmentId: 'dept-cse', programId: 'prog-cse', semesterId: semesterId('prog-cse', 3), sectionId: sectionId('prog-cse', 3, 'A'), year: 2, cgpa: 8.2, avatarColor: INFO, mentorName: 'Dr. Priya Verghese', bloodGroup: 'A-', gender: 'Female', dob: '2004-02-14' },
  { id: 'stu-007', name: 'Vishnu Prasad', rollNo: 'CSE21-007', admissionNo: 'ADM2021007', email: 'vishnu.prasad@campus.edu.in', phone: '+91 98470 20007', departmentId: 'dept-cse', programId: 'prog-cse', semesterId: semesterId('prog-cse', 3), sectionId: sectionId('prog-cse', 3, 'A'), year: 2, cgpa: 7.3, avatarColor: NAVY, mentorName: 'Dr. Priya Verghese', bloodGroup: 'B-', gender: 'Male', dob: '2004-03-27' },
  { id: 'stu-008', name: 'Sneha Raj', rollNo: 'ECE21-008', admissionNo: 'ADM2021008', email: 'sneha.raj@campus.edu.in', phone: '+91 98470 20008', departmentId: 'dept-ece', programId: 'prog-ece', semesterId: ECE_SEM5, sectionId: sectionId('prog-ece', 5, 'A'), year: 3, cgpa: 8.0, avatarColor: TEAL, mentorName: 'Dr. Meera Iyer', bloodGroup: 'O+', gender: 'Female', dob: '2003-08-09' },
  { id: 'stu-009', name: 'Arun Das', rollNo: 'ECE21-009', admissionNo: 'ADM2021009', email: 'arun.das@campus.edu.in', phone: '+91 98470 20009', departmentId: 'dept-ece', programId: 'prog-ece', semesterId: ECE_SEM5, sectionId: sectionId('prog-ece', 5, 'A'), year: 3, cgpa: 7.5, avatarColor: PURPLE, mentorName: 'Dr. Meera Iyer', bloodGroup: 'A+', gender: 'Male', dob: '2003-05-16' },
  { id: 'stu-010', name: 'Priyanka Joseph', rollNo: 'MECH21-010', admissionNo: 'ADM2021010', email: 'priyanka.joseph@campus.edu.in', phone: '+91 98470 20010', departmentId: 'dept-mech', programId: 'prog-mech', semesterId: semesterId('prog-mech', 5), sectionId: sectionId('prog-mech', 5, 'A'), year: 3, cgpa: 8.6, avatarColor: WARNING, mentorName: 'Dr. Vinod Kumar', bloodGroup: 'B+', gender: 'Female', dob: '2003-10-03' },
];

export const faculty: FacultyMember[] = [
  { id: 'fac-rajesh', name: 'Dr. Rajesh Menon', email: 'rajesh.menon@campus.edu.in', phone: '+91 98470 33221', department: 'Computer Science & Engineering', designation: 'Associate Professor', avatarColor: PURPLE },
  { id: 'fac-anita', name: 'Prof. Anita Nair', email: 'anita.nair@campus.edu.in', phone: '+91 98470 33222', department: 'Computer Science & Engineering', designation: 'Assistant Professor', avatarColor: INFO },
  { id: 'fac-priya', name: 'Dr. Priya Verghese', email: 'priya.verghese@campus.edu.in', phone: '+91 98470 33223', department: 'Computer Science & Engineering', designation: 'Professor', avatarColor: TEAL },
  { id: 'fac-meera', name: 'Dr. Meera Iyer', email: 'meera.iyer@campus.edu.in', phone: '+91 98470 33224', department: 'Electronics & Communication', designation: 'Associate Professor', avatarColor: WARNING },
  { id: 'fac-vinod', name: 'Dr. Vinod Kumar', email: 'vinod.kumar@campus.edu.in', phone: '+91 98470 33225', department: 'Mechanical Engineering', designation: 'Professor', avatarColor: NAVY },
];

export const platformUsers: PlatformUser[] = [
  { id: 'usr-student', name: 'Abin Thomas', email: 'abin.thomas@campus.edu.in', role: 'student', active: true, avatarColor: NAVY },
  { id: 'usr-faculty', name: 'Dr. Rajesh Menon', email: 'rajesh.menon@campus.edu.in', role: 'faculty', active: true, avatarColor: PURPLE },
  { id: 'usr-hod', name: 'Dr. Suresh Pillai', email: 'suresh.pillai@campus.edu.in', role: 'hod', active: true, avatarColor: WARNING },
  { id: 'usr-principal', name: 'Dr. Geetha Krishnan', email: 'principal@campus.edu.in', role: 'principal', active: true, avatarColor: PINK },
  { id: 'usr-admin', name: 'Campus Admin', email: 'admin@campus.edu.in', role: 'admin', active: true, avatarColor: INFO },
];

export const CORE_USER_IDS = ['usr-student', 'usr-faculty', 'usr-hod', 'usr-principal', 'usr-admin'];

const SEC_A = sectionId('prog-cse', 5, 'A');
const SEC_B = sectionId('prog-cse', 5, 'B');

export const sessions: ClassSession[] = [
  { id: 'sess-1', subjectId: 'sub-ds', sectionId: SEC_A, facultyId: 'fac-rajesh', facultyName: 'Dr. Rajesh Menon', day: 'Mon', start: '09:00', end: '10:00', room: 'CS-101', type: 'Lecture' },
  { id: 'sess-2', subjectId: 'sub-dbms', sectionId: SEC_A, facultyId: 'fac-anita', facultyName: 'Prof. Anita Nair', day: 'Mon', start: '10:00', end: '11:00', room: 'CS-102', type: 'Lecture' },
  { id: 'sess-3', subjectId: 'sub-os', sectionId: SEC_A, facultyId: 'fac-rajesh', facultyName: 'Dr. Rajesh Menon', day: 'Tue', start: '09:00', end: '10:00', room: 'CS-101', type: 'Lecture' },
  { id: 'sess-4', subjectId: 'sub-maths', sectionId: SEC_A, facultyId: 'fac-priya', facultyName: 'Dr. Priya Verghese', day: 'Wed', start: '11:00', end: '12:00', room: 'CS-201', type: 'Tutorial' },
  { id: 'sess-5', subjectId: 'sub-phy', sectionId: SEC_A, facultyId: 'fac-priya', facultyName: 'Dr. Priya Verghese', day: 'Thu', start: '14:00', end: '16:00', room: 'PHY-LAB1', type: 'Lab' },
  { id: 'sess-6', subjectId: 'sub-cn', sectionId: SEC_A, facultyId: 'fac-anita', facultyName: 'Prof. Anita Nair', day: 'Fri', start: '09:00', end: '10:00', room: 'CS-101', type: 'Lecture' },
  { id: 'sess-7', subjectId: 'sub-ds', sectionId: SEC_B, facultyId: 'fac-rajesh', facultyName: 'Dr. Rajesh Menon', day: 'Mon', start: '11:00', end: '12:00', room: 'CS-103', type: 'Lecture' },
];

export const fees: FeeInvoice[] = [
  { id: 'fee-1', studentId: 'stu-abin', studentName: 'Abin Thomas', title: 'Semester 5 Tuition', term: 'Odd 2026', amount: 62000, dueDate: offsetDays(-5), status: 'overdue' },
  { id: 'fee-2', studentId: 'stu-abin', studentName: 'Abin Thomas', title: 'Hostel Fee', term: 'Odd 2026', amount: 28000, dueDate: offsetDays(-40), status: 'paid', paidOn: offsetDays(-42) },
  { id: 'fee-3', studentId: 'stu-002', studentName: 'Meera Pillai', title: 'Semester 5 Tuition', term: 'Odd 2026', amount: 62000, dueDate: offsetDays(10), status: 'due' },
  { id: 'fee-4', studentId: 'stu-003', studentName: 'Rohan Nair', title: 'Semester 5 Tuition', term: 'Odd 2026', amount: 62000, dueDate: offsetDays(10), status: 'due' },
  { id: 'fee-5', studentId: 'stu-004', studentName: 'Anjali Varma', title: 'Semester 5 Tuition', term: 'Odd 2026', amount: 62000, dueDate: offsetDays(-60), status: 'paid', paidOn: offsetDays(-61) },
  { id: 'fee-6', studentId: 'stu-005', studentName: 'Karthik Suresh', title: 'Exam Fee', term: 'Odd 2026', amount: 3500, dueDate: offsetDays(-10), status: 'overdue' },
];

export const books: Book[] = [
  { id: 'book-1', title: 'Introduction to Algorithms', author: 'Cormen, Leiserson, Rivest, Stein', category: 'Computer Science', isbn: '978-0262033848', copies: 6, available: 2 },
  { id: 'book-2', title: 'Database System Concepts', author: 'Silberschatz, Korth, Sudarshan', category: 'Computer Science', isbn: '978-0073523323', copies: 5, available: 5 },
  { id: 'book-3', title: 'Operating System Concepts', author: 'Silberschatz, Galvin, Gagne', category: 'Computer Science', isbn: '978-1118063330', copies: 4, available: 1 },
  { id: 'book-4', title: 'Computer Networks', author: 'Andrew S. Tanenbaum', category: 'Computer Science', isbn: '978-0132126953', copies: 4, available: 3 },
  { id: 'book-5', title: 'Engineering Mathematics III', author: 'B.S. Grewal', category: 'Mathematics', isbn: '978-8174091955', copies: 8, available: 6 },
  { id: 'book-6', title: 'Digital Signal Processing', author: 'John G. Proakis', category: 'Electronics', isbn: '978-0131873742', copies: 3, available: 2 },
  { id: 'book-7', title: 'Mechanics of Materials', author: 'R.C. Hibbeler', category: 'Mechanical', isbn: '978-0134319650', copies: 4, available: 4 },
  { id: 'book-8', title: 'Clean Code', author: 'Robert C. Martin', category: 'Computer Science', isbn: '978-0132350884', copies: 3, available: 0 },
];

export const bookLoans: BookLoan[] = [
  { id: 'loan-1', bookId: 'book-1', bookTitle: 'Introduction to Algorithms', studentId: 'stu-abin', studentName: 'Abin Thomas', issuedOn: offsetDate(-10), dueOn: offsetDate(4), status: 'active' },
  { id: 'loan-2', bookId: 'book-3', bookTitle: 'Operating System Concepts', studentId: 'stu-002', studentName: 'Meera Pillai', issuedOn: offsetDate(-20), dueOn: offsetDate(-6), status: 'overdue' },
];

export const hostelBlocks: HostelBlock[] = [
  { id: 'block-c', name: "Block C — Men's Hostel", warden: 'Mr. Biju Thomas', wardenPhone: '+91 98470 90001' },
  { id: 'block-d', name: "Block D — Women's Hostel", warden: 'Mrs. Ancy Varghese', wardenPhone: '+91 98470 90002' },
];

export const hostelRooms: HostelRoom[] = [
  { id: 'room-c201', blockId: 'block-c', roomNo: 'C-201', capacity: 3 },
  { id: 'room-c202', blockId: 'block-c', roomNo: 'C-202', capacity: 3 },
  { id: 'room-d101', blockId: 'block-d', roomNo: 'D-101', capacity: 2 },
];

export const hostelAllocations: HostelAllocation[] = [
  { id: 'alloc-1', studentId: 'stu-abin', studentName: 'Abin Thomas', roomId: 'room-c201', bed: 'Lower', messPlan: 'Veg + Non-Veg', fees: 28000 },
];

export const busRoutes: BusRoute[] = [
  { id: 'bus-1', name: 'City Center Route', number: 'KL-07-BX-4521', driver: 'Mohan Kumar', driverPhone: '+91 98470 88001' },
  { id: 'bus-2', name: 'Highway Route', number: 'KL-07-BX-4522', driver: 'Suraj Nair', driverPhone: '+91 98470 88002' },
  { id: 'bus-3', name: 'Riverside Route', number: 'KL-07-BX-4523', driver: 'Anil Joseph', driverPhone: '+91 98470 88003' },
];

export const busStops: BusStop[] = [
  { id: 'stop-1', routeId: 'bus-1', name: 'City Center', time: '07:30', order: 1 },
  { id: 'stop-2', routeId: 'bus-1', name: 'Railway Station', time: '07:45', order: 2 },
  { id: 'stop-3', routeId: 'bus-1', name: 'Campus Gate', time: '08:15', order: 3 },
  { id: 'stop-4', routeId: 'bus-2', name: 'Highway Junction', time: '07:20', order: 1 },
  { id: 'stop-5', routeId: 'bus-2', name: 'Tech Park', time: '07:50', order: 2 },
  { id: 'stop-6', routeId: 'bus-2', name: 'Campus Gate', time: '08:15', order: 3 },
];

export const busLiveStatuses: BusLiveStatus[] = [
  { id: 'live-1', routeId: 'bus-1', currentStop: 'Railway Station', nextStop: 'Campus Gate', etaMins: 12, occupancy: 35 },
];

export const notifications: NotificationItem[] = [
  { id: 'notif-1', title: 'Semester 5 fee due', body: 'Please clear tuition fee dues before the deadline.', category: 'fee', broadcastRole: 'student', read: false, sentAt: offsetDays(-2) },
  { id: 'notif-2', title: 'Tech Fest registrations open', body: 'Register for AI Campus Tech Fest 2026 by Friday.', category: 'event', broadcastRole: '', read: false, sentAt: offsetDays(-5) },
  { id: 'notif-3', title: 'Mid-semester exam schedule', body: 'Mid-sem exams begin next Monday. Check timetable.', category: 'academic', broadcastRole: 'student', read: true, sentAt: offsetDays(-8) },
];

export const auditLogs: AuditLog[] = [
  { id: 'audit-1', at: offsetDays(-1), actor: 'Campus Admin', action: 'update', entity: 'Fee Invoice', detail: 'Marked fee-4 as paid for Anjali Varma' },
  { id: 'audit-2', at: offsetDays(-2), actor: 'Campus Admin', action: 'broadcast', entity: 'Notification', detail: 'Broadcast "Semester 5 fee due" to students' },
  { id: 'audit-3', at: offsetDays(-3), actor: 'Campus Admin', action: 'create', entity: 'Student', detail: 'Added student Priyanka Joseph (MECH21-010)' },
  { id: 'audit-4', at: offsetDays(-4), actor: 'Campus Admin', action: 'update', entity: 'Subject', detail: 'Updated credits for CS304 Computer Networks' },
  { id: 'audit-5', at: offsetDays(-6), actor: 'Campus Admin', action: 'create', entity: 'Department', detail: 'Added department MBA' },
];

// ---------- Exams & Results ----------
export const exams: Exam[] = [
  { id: 'exam-1', subjectId: 'sub-ds', subjectCode: 'CS301', subjectName: 'Data Structures', name: 'Mid Semester Exam', date: offsetDate(10), time: '10:00', room: 'Hall-A', durationMins: 120, type: 'Internal' },
  { id: 'exam-2', subjectId: 'sub-dbms', subjectCode: 'CS302', subjectName: 'Database Management Systems', name: 'Mid Semester Exam', date: offsetDate(12), time: '10:00', room: 'Hall-A', durationMins: 120, type: 'Internal' },
];

export const examResults: ExamResult[] = [
  { id: 'result-1', studentId: 'stu-abin', studentName: 'Abin Thomas', subjectId: 'sub-ds', subjectName: 'Data Structures', examRef: 'exam-1', exam: 'Mid Semester', marks: 85, maxMarks: 100, grade: 'A', gradePoint: 9, credits: 4 },
  { id: 'result-2', studentId: 'stu-002', studentName: 'Meera Pillai', subjectId: 'sub-ds', subjectName: 'Data Structures', examRef: 'exam-1', exam: 'Mid Semester', marks: 92, maxMarks: 100, grade: 'A+', gradePoint: 10, credits: 4 },
];

// ---------- Assignments & Materials ----------
export const assignments: Assignment[] = [
  { id: 'asg-1', subjectId: 'sub-ds', subjectCode: 'CS301', subjectName: 'Data Structures', title: 'DSA Problem Set 3', description: 'Solve problems 1-10 from chapter 5', dueDate: offsetDays(7), maxMarks: 100, status: 'pending' },
  { id: 'asg-2', subjectId: 'sub-dbms', subjectCode: 'CS302', subjectName: 'Database Management Systems', title: 'ER Diagram Assignment', description: 'Design an ER diagram for a library system', dueDate: offsetDays(3), maxMarks: 50, status: 'pending' },
];

export const materials: Material[] = [
  { id: 'mat-1', subjectId: 'sub-ds', title: 'Week 5 - Trees & Graphs', kind: 'note', sizeLabel: '2.4 MB', url: 'https://storage.example.com/notes/week5.pdf', addedAt: offsetDays(-10) },
  { id: 'mat-2', subjectId: 'sub-dbms', title: 'Normalization Slides', kind: 'pdf', sizeLabel: '1.1 MB', url: 'https://storage.example.com/notes/normalization.pdf', addedAt: offsetDays(-6) },
];

// ---------- Quizzes ----------
export const quizzes: Quiz[] = [
  {
    id: 'quiz-1',
    subjectId: 'sub-ds',
    title: 'DSA Quiz 3 - Trees',
    questions: [
      { id: 'q-1', q: 'Which traversal visits root first?', options: ['Inorder', 'Preorder', 'Postorder', 'Level-order'], answerIndex: 1 },
      { id: 'q-2', q: 'Height of balanced BST with n nodes?', options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'], answerIndex: 1 },
    ],
  },
];

// ---------- Placements ----------
export const placementOpenings: PlacementOpening[] = [
  { id: 'place-1', company: 'Google', role: 'Software Engineer', ctc: 25, location: 'Bangalore', eligibility: 'CGPA >= 7.0, CSE/IT only', lastDate: offsetDate(20), logoColor: '#4285F4', isActive: true },
  { id: 'place-2', company: 'Microsoft', role: 'Associate SWE', ctc: 22, location: 'Hyderabad', eligibility: 'CGPA >= 7.5', lastDate: offsetDate(15), logoColor: '#00A4EF', isActive: true },
];

export const placementApplications: PlacementApplication[] = [
  { id: 'app-1', openingId: 'place-1', companyRole: 'Google — Software Engineer', studentId: 'stu-002', studentName: 'Meera Pillai', status: 'shortlisted', appliedOn: offsetDate(-5) },
];

// ---------- Events ----------
export const events: EventItem[] = [
  { id: 'event-1', title: 'Tech Fest 2026', date: offsetDate(25), time: '10:00', venue: 'Main Auditorium', category: 'tech', description: 'Annual tech and cultural fest' },
  { id: 'event-2', title: 'Inter-college Cricket', date: offsetDate(30), time: '08:00', venue: 'Sports Ground', category: 'sports' },
];

// ---------- Complaints ----------
export const complaints: Complaint[] = [
  { id: 'comp-1', studentId: 'stu-abin', studentName: 'Abin Thomas', category: 'Hostel', subject: 'Water leakage in room', description: 'Continuous water leakage from ceiling in room C-201.', status: 'open', createdOn: offsetDate(-3) },
  { id: 'comp-2', studentId: 'stu-003', studentName: 'Rohan Nair', category: 'Library', subject: 'AC not working', description: 'AC in the reading hall has not worked for a week.', status: 'in_progress', createdOn: offsetDate(-6) },
];

// ---------- Leave ----------
export const leaveRequests: LeaveRequest[] = [
  { id: 'leave-1', studentId: 'stu-002', studentName: 'Meera Pillai', type: 'sick', fromDate: offsetDate(2), toDate: offsetDate(4), reason: 'Fever and cold', status: 'pending', appliedOn: offsetDate(-1) },
  { id: 'leave-2', studentId: 'stu-004', studentName: 'Anjali Varma', type: 'event', fromDate: offsetDate(10), toDate: offsetDate(10), reason: 'State-level badminton tournament', status: 'approved', appliedOn: offsetDate(-4) },
];

// ---------- Certificates ----------
export const certificates: Certificate[] = [
  { id: 'cert-1', studentId: 'stu-abin', studentName: 'Abin Thomas', title: 'Course Completion - Python', issuer: 'NPTEL', issuedOn: offsetDate(-60), kind: 'course', url: 'https://nptel.ac.in/cert/example' },
];
