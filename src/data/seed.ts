import type {
  AdminAccount,
  AuditLog,
  Book,
  BusRoute,
  ClassSession,
  Course,
  Department,
  FacultyMember,
  FeeInvoice,
  HostelInfo,
  NotificationItem,
  ParentAccount,
  PlatformUser,
  Student,
  Subject,
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

export const adminAccounts: AdminAccount[] = [
  { id: 'usr-admin', name: 'Campus Admin', email: 'admin@campus.edu.in', role: 'admin', avatarColor: INFO },
  { id: 'usr-superadmin', name: 'System Super Admin', email: 'superadmin@campus.edu.in', role: 'superadmin', avatarColor: NAVY },
];

export const departments: Department[] = [
  { id: 'dept-cse', code: 'CSE', name: 'Computer Science & Engineering', hod: 'Dr. Suresh Pillai' },
  { id: 'dept-ece', code: 'ECE', name: 'Electronics & Communication', hod: 'Dr. Meera Iyer' },
  { id: 'dept-mech', code: 'MECH', name: 'Mechanical Engineering', hod: 'Dr. Vinod Kumar' },
  { id: 'dept-civil', code: 'CIVIL', name: 'Civil Engineering', hod: 'Dr. Latha Menon' },
  { id: 'dept-mba', code: 'MBA', name: 'Business Administration', hod: 'Dr. Arjun Nair' },
];

export const courses: Course[] = [
  { id: 'course-cse', code: 'BT-CSE', name: 'B.Tech Computer Science', departmentCode: 'CSE', durationYears: 4, intake: 120, color: NAVY },
  { id: 'course-ece', code: 'BT-ECE', name: 'B.Tech Electronics & Comm.', departmentCode: 'ECE', durationYears: 4, intake: 90, color: INFO },
  { id: 'course-mech', code: 'BT-MECH', name: 'B.Tech Mechanical', departmentCode: 'MECH', durationYears: 4, intake: 60, color: WARNING },
  { id: 'course-civil', code: 'BT-CIVIL', name: 'B.Tech Civil', departmentCode: 'CIVIL', durationYears: 4, intake: 60, color: TEAL },
  { id: 'course-mba', code: 'MBA', name: 'Master of Business Admin.', departmentCode: 'MBA', durationYears: 2, intake: 60, color: PINK },
];

export const subjects: Subject[] = [
  { id: 'sub-ds', code: 'CS301', name: 'Data Structures', credits: 4, faculty: 'Dr. Rajesh Menon', departmentCode: 'CSE', color: NAVY },
  { id: 'sub-dbms', code: 'CS302', name: 'Database Management Systems', credits: 4, faculty: 'Prof. Anita Nair', departmentCode: 'CSE', color: PURPLE },
  { id: 'sub-os', code: 'CS303', name: 'Operating Systems', credits: 4, faculty: 'Dr. Rajesh Menon', departmentCode: 'CSE', color: TEAL },
  { id: 'sub-maths', code: 'MA301', name: 'Mathematics III', credits: 3, faculty: 'Dr. Priya Verghese', departmentCode: 'CSE', color: WARNING },
  { id: 'sub-phy', code: 'PH301', name: 'Physics Lab', credits: 1, faculty: 'Dr. Priya Verghese', departmentCode: 'CSE', color: INFO },
  { id: 'sub-cn', code: 'CS304', name: 'Computer Networks', credits: 3, faculty: 'Prof. Anita Nair', departmentCode: 'CSE', color: PINK },
  { id: 'sub-ec1', code: 'EC301', name: 'Digital Signal Processing', credits: 4, faculty: 'Dr. Meera Iyer', departmentCode: 'ECE', color: INFO },
];

export const CORE_SUBJECT_IDS = ['sub-ds', 'sub-dbms', 'sub-os', 'sub-maths', 'sub-phy', 'sub-cn'];

export const students: Student[] = [
  // students[0] is the anchor demo student (guarded — cannot be removed), matches the mobile app + backend.
  { id: 'stu-abin', name: 'Abin Thomas', rollNo: 'CSE21-014', admissionNo: 'ADM2021014', email: 'abin.thomas@campus.edu.in', phone: '+91 98470 12345', program: 'B.Tech', branch: 'CSE', semester: 5, section: 'A', year: 3, cgpa: 8.4, avatarColor: NAVY, mentorName: 'Dr. Rajesh Menon', bloodGroup: 'O+', gender: 'Male', dob: '2003-04-12' },
  { id: 'stu-002', name: 'Meera Pillai', rollNo: 'CSE21-002', admissionNo: 'ADM2021002', email: 'meera.pillai@campus.edu.in', phone: '+91 98470 20002', program: 'B.Tech', branch: 'CSE', semester: 5, section: 'A', year: 3, cgpa: 9.1, avatarColor: PURPLE, mentorName: 'Dr. Rajesh Menon', bloodGroup: 'A+', gender: 'Female', dob: '2003-01-22' },
  { id: 'stu-003', name: 'Rohan Nair', rollNo: 'CSE21-003', admissionNo: 'ADM2021003', email: 'rohan.nair@campus.edu.in', phone: '+91 98470 20003', program: 'B.Tech', branch: 'CSE', semester: 5, section: 'A', year: 3, cgpa: 7.6, avatarColor: TEAL, mentorName: 'Prof. Anita Nair', bloodGroup: 'B+', gender: 'Male', dob: '2003-09-05' },
  { id: 'stu-004', name: 'Anjali Varma', rollNo: 'CSE21-004', admissionNo: 'ADM2021004', email: 'anjali.varma@campus.edu.in', phone: '+91 98470 20004', program: 'B.Tech', branch: 'CSE', semester: 5, section: 'B', year: 3, cgpa: 8.9, avatarColor: PINK, mentorName: 'Prof. Anita Nair', bloodGroup: 'AB+', gender: 'Female', dob: '2003-06-18' },
  { id: 'stu-005', name: 'Karthik Suresh', rollNo: 'CSE21-005', admissionNo: 'ADM2021005', email: 'karthik.suresh@campus.edu.in', phone: '+91 98470 20005', program: 'B.Tech', branch: 'CSE', semester: 5, section: 'B', year: 3, cgpa: 6.9, avatarColor: WARNING, mentorName: 'Dr. Rajesh Menon', bloodGroup: 'O-', gender: 'Male', dob: '2003-11-30' },
  { id: 'stu-006', name: 'Divya Krishnan', rollNo: 'CSE21-006', admissionNo: 'ADM2021006', email: 'divya.krishnan@campus.edu.in', phone: '+91 98470 20006', program: 'B.Tech', branch: 'CSE', semester: 3, section: 'A', year: 2, cgpa: 8.2, avatarColor: INFO, mentorName: 'Dr. Priya Verghese', bloodGroup: 'A-', gender: 'Female', dob: '2004-02-14' },
  { id: 'stu-007', name: 'Vishnu Prasad', rollNo: 'CSE21-007', admissionNo: 'ADM2021007', email: 'vishnu.prasad@campus.edu.in', phone: '+91 98470 20007', program: 'B.Tech', branch: 'CSE', semester: 3, section: 'A', year: 2, cgpa: 7.3, avatarColor: NAVY, mentorName: 'Dr. Priya Verghese', bloodGroup: 'B-', gender: 'Male', dob: '2004-03-27' },
  { id: 'stu-008', name: 'Sneha Raj', rollNo: 'ECE21-008', admissionNo: 'ADM2021008', email: 'sneha.raj@campus.edu.in', phone: '+91 98470 20008', program: 'B.Tech', branch: 'ECE', semester: 5, section: 'A', year: 3, cgpa: 8.0, avatarColor: TEAL, mentorName: 'Dr. Meera Iyer', bloodGroup: 'O+', gender: 'Female', dob: '2003-08-09' },
  { id: 'stu-009', name: 'Arun Das', rollNo: 'ECE21-009', admissionNo: 'ADM2021009', email: 'arun.das@campus.edu.in', phone: '+91 98470 20009', program: 'B.Tech', branch: 'ECE', semester: 5, section: 'A', year: 3, cgpa: 7.5, avatarColor: PURPLE, mentorName: 'Dr. Meera Iyer', bloodGroup: 'A+', gender: 'Male', dob: '2003-05-16' },
  { id: 'stu-010', name: 'Priyanka Joseph', rollNo: 'MECH21-010', admissionNo: 'ADM2021010', email: 'priyanka.joseph@campus.edu.in', phone: '+91 98470 20010', program: 'B.Tech', branch: 'MECH', semester: 5, section: 'A', year: 3, cgpa: 8.6, avatarColor: WARNING, mentorName: 'Dr. Vinod Kumar', bloodGroup: 'B+', gender: 'Female', dob: '2003-10-03' },
];

export const faculty: FacultyMember[] = [
  { id: 'fac-rajesh', name: 'Dr. Rajesh Menon', email: 'rajesh.menon@campus.edu.in', phone: '+91 98470 33221', department: 'Computer Science & Engineering', designation: 'Associate Professor', avatarColor: PURPLE },
  { id: 'fac-anita', name: 'Prof. Anita Nair', email: 'anita.nair@campus.edu.in', phone: '+91 98470 33222', department: 'Computer Science & Engineering', designation: 'Assistant Professor', avatarColor: INFO },
  { id: 'fac-priya', name: 'Dr. Priya Verghese', email: 'priya.verghese@campus.edu.in', phone: '+91 98470 33223', department: 'Computer Science & Engineering', designation: 'Professor', avatarColor: TEAL },
  { id: 'fac-meera', name: 'Dr. Meera Iyer', email: 'meera.iyer@campus.edu.in', phone: '+91 98470 33224', department: 'Electronics & Communication', designation: 'Associate Professor', avatarColor: WARNING },
  { id: 'fac-vinod', name: 'Dr. Vinod Kumar', email: 'vinod.kumar@campus.edu.in', phone: '+91 98470 33225', department: 'Mechanical Engineering', designation: 'Professor', avatarColor: NAVY },
];

export const parents: ParentAccount[] = [
  { id: 'par-thomas', name: 'Thomas Varghese', email: 'thomas.varghese@gmail.com', phone: '+91 98470 55001', relation: 'Father', childId: 'stu-abin', avatarColor: TEAL },
  { id: 'par-pillai', name: 'Sunitha Pillai', email: 'sunitha.pillai@gmail.com', phone: '+91 98470 55002', relation: 'Mother', childId: 'stu-002', avatarColor: PURPLE },
  { id: 'par-nair', name: 'Ramesh Nair', email: 'ramesh.nair@gmail.com', phone: '+91 98470 55003', relation: 'Father', childId: 'stu-003', avatarColor: INFO },
  { id: 'par-varma', name: 'Suresh Varma', email: 'suresh.varma@gmail.com', phone: '+91 98470 55004', relation: 'Father', childId: 'stu-004', avatarColor: PINK },
];

export const platformUsers: PlatformUser[] = [
  { id: 'usr-student', name: 'Abin Thomas', email: 'abin.thomas@campus.edu.in', role: 'student', active: true, avatarColor: NAVY },
  { id: 'usr-parent', name: 'Thomas Varghese', email: 'thomas.varghese@gmail.com', role: 'parent', active: true, avatarColor: TEAL },
  { id: 'usr-faculty', name: 'Dr. Rajesh Menon', email: 'rajesh.menon@campus.edu.in', role: 'faculty', active: true, avatarColor: PURPLE },
  { id: 'usr-hod', name: 'Dr. Suresh Pillai', email: 'suresh.pillai@campus.edu.in', role: 'hod', active: true, avatarColor: WARNING },
  { id: 'usr-principal', name: 'Dr. Geetha Krishnan', email: 'principal@campus.edu.in', role: 'principal', active: true, avatarColor: PINK },
  { id: 'usr-admin', name: 'Campus Admin', email: 'admin@campus.edu.in', role: 'admin', active: true, avatarColor: INFO },
];

export const CORE_USER_IDS = ['usr-student', 'usr-parent', 'usr-faculty', 'usr-hod', 'usr-principal', 'usr-admin'];

export const sessions: ClassSession[] = [
  { id: 'sess-1', subjectId: 'sub-ds', day: 'Mon', start: '09:00', end: '10:00', room: 'CS-101', section: 'A', semester: 5, type: 'Lecture' },
  { id: 'sess-2', subjectId: 'sub-dbms', day: 'Mon', start: '10:00', end: '11:00', room: 'CS-102', section: 'A', semester: 5, type: 'Lecture' },
  { id: 'sess-3', subjectId: 'sub-os', day: 'Tue', start: '09:00', end: '10:00', room: 'CS-101', section: 'A', semester: 5, type: 'Lecture' },
  { id: 'sess-4', subjectId: 'sub-maths', day: 'Wed', start: '11:00', end: '12:00', room: 'CS-201', section: 'A', semester: 5, type: 'Tutorial' },
  { id: 'sess-5', subjectId: 'sub-phy', day: 'Thu', start: '14:00', end: '16:00', room: 'PHY-LAB1', section: 'A', semester: 5, type: 'Lab' },
  { id: 'sess-6', subjectId: 'sub-cn', day: 'Fri', start: '09:00', end: '10:00', room: 'CS-101', section: 'A', semester: 5, type: 'Lecture' },
  { id: 'sess-7', subjectId: 'sub-ds', day: 'Mon', start: '11:00', end: '12:00', room: 'CS-103', section: 'B', semester: 5, type: 'Lecture' },
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
  { id: 'book-1', title: 'Introduction to Algorithms', author: 'Cormen, Leiserson, Rivest, Stein', category: 'Computer Science', copies: 6, available: 2 },
  { id: 'book-2', title: 'Database System Concepts', author: 'Silberschatz, Korth, Sudarshan', category: 'Computer Science', copies: 5, available: 5 },
  { id: 'book-3', title: 'Operating System Concepts', author: 'Silberschatz, Galvin, Gagne', category: 'Computer Science', copies: 4, available: 1 },
  { id: 'book-4', title: 'Computer Networks', author: 'Andrew S. Tanenbaum', category: 'Computer Science', copies: 4, available: 3 },
  { id: 'book-5', title: 'Engineering Mathematics III', author: 'B.S. Grewal', category: 'Mathematics', copies: 8, available: 6 },
  { id: 'book-6', title: 'Digital Signal Processing', author: 'John G. Proakis', category: 'Electronics', copies: 3, available: 2 },
  { id: 'book-7', title: 'Mechanics of Materials', author: 'R.C. Hibbeler', category: 'Mechanical', copies: 4, available: 4 },
  { id: 'book-8', title: 'Clean Code', author: 'Robert C. Martin', category: 'Computer Science', copies: 3, available: 0 },
];

export const busRoutes: BusRoute[] = [
  { id: 'bus-1', name: 'City Center Route', number: 'KL-07-BX-4521', driver: 'Mohan Kumar', driverPhone: '+91 98470 88001', stops: [{ name: 'City Center', time: '07:30' }, { name: 'Railway Station', time: '07:45' }, { name: 'Campus Gate', time: '08:15' }] },
  { id: 'bus-2', name: 'Highway Route', number: 'KL-07-BX-4522', driver: 'Suraj Nair', driverPhone: '+91 98470 88002', stops: [{ name: 'Highway Junction', time: '07:20' }, { name: 'Tech Park', time: '07:50' }, { name: 'Campus Gate', time: '08:15' }] },
  { id: 'bus-3', name: 'Riverside Route', number: 'KL-07-BX-4523', driver: 'Anil Joseph', driverPhone: '+91 98470 88003', stops: [{ name: 'Riverside Colony', time: '07:15' }, { name: 'Market Junction', time: '07:40' }, { name: 'Campus Gate', time: '08:15' }] },
];

export const hostel: HostelInfo = {
  block: 'Block C — Men\'s Hostel',
  totalRooms: 120,
  occupied: 104,
  warden: 'Mr. Biju Thomas',
  wardenPhone: '+91 98470 90001',
  messPlan: 'Veg + Non-Veg, 3 meals/day',
  fees: 28000,
};

export const notifications: NotificationItem[] = [
  { id: 'notif-1', title: 'Semester 5 fee due', body: 'Please clear tuition fee dues before the deadline.', category: 'fee', audience: 'student', sentAt: offsetDays(-2) },
  { id: 'notif-2', title: 'Tech Fest registrations open', body: 'Register for AI Campus Tech Fest 2026 by Friday.', category: 'event', audience: 'all', sentAt: offsetDays(-5) },
  { id: 'notif-3', title: 'Mid-semester exam schedule', body: 'Mid-sem exams begin next Monday. Check timetable.', category: 'academic', audience: 'student', sentAt: offsetDays(-8) },
];

export const auditLogs: AuditLog[] = [
  { id: 'audit-1', at: offsetDays(-1), actor: 'Campus Admin', action: 'update', entity: 'Fee Invoice', detail: 'Marked fee-4 as paid for Anjali Varma' },
  { id: 'audit-2', at: offsetDays(-2), actor: 'Campus Admin', action: 'broadcast', entity: 'Notification', detail: 'Broadcast "Semester 5 fee due" to students' },
  { id: 'audit-3', at: offsetDays(-3), actor: 'Campus Admin', action: 'create', entity: 'Student', detail: 'Added student Priyanka Joseph (MECH21-010)' },
  { id: 'audit-4', at: offsetDays(-4), actor: 'Campus Admin', action: 'update', entity: 'Subject', detail: 'Updated credits for CS304 Computer Networks' },
  { id: 'audit-5', at: offsetDays(-6), actor: 'Campus Admin', action: 'create', entity: 'Department', detail: 'Added department MBA' },
];
