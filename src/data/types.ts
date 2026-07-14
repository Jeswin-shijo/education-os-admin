export type Role = 'student' | 'faculty' | 'hod' | 'principal' | 'admin';
export type Weekday = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

export type AdminAccount = {
  id: string;
  name: string;
  email: string;
  role: string; // 'admin' | 'super_admin' from the real backend, 'admin' | 'superadmin' in mock
  avatarColor: string;
};

export type Gender = 'Male' | 'Female' | 'Other';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export type Student = {
  id: string;
  name: string;
  rollNo: string;
  admissionNo: string;
  email: string;
  phone: string;
  departmentId: string;
  programId: string;
  semesterId: string;
  sectionId: string;
  year: number;
  cgpa: number;
  avatarColor: string;
  avatarUrl?: string;
  mentorName: string;
  bloodGroup: string;
  gender: Gender;
  dob: string;
  address?: string;
};

export type Shift = 'Morning' | 'Afternoon' | 'Evening';

export type FacultyMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  qualifications?: string;
  experience?: string;
  photoUrl?: string;
  avatarColor: string;
};

export type FacultyCandidate = {
  id: string;
  fullName: string;
  email: string;
};

export type PlatformUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  avatarColor: string;
};

export type Department = {
  id: string;
  code: string;
  name: string;
  hod?: string; // references HodCandidate.id
};

export type HodCandidate = {
  id: string;
  fullName: string;
  email: string;
  role: 'faculty' | 'hod';
};

export type Program = {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  durationYears: number;
  intake: number;
  color: string;
};

export type Semester = {
  id: string;
  programId: string;
  number: number;
};

export type Section = {
  id: string;
  semesterId: string;
  name: string;
  shift?: Shift;
};

export type Subject = {
  id: string;
  code: string;
  name: string;
  credits: number;
  departmentId: string;
  programId?: string;
  semesterId: string;
  academicSession?: string; // e.g. "2026-2027"
  facultyIds?: string[]; // multiple faculty
  facultyNames?: string[];
  facultyId?: string; // legacy single (back-compat)
  facultyName?: string;
  color: string;
};

export type SessionStatus = 'active' | 'inactive';

export type ClassSession = {
  id: string;
  subjectId: string;
  sectionId: string;
  facultyId?: string;
  facultyName?: string;
  academicSession?: string;
  shift?: Shift;
  status?: SessionStatus;
  day: Weekday;
  start: string;
  end: string;
  durationMins?: number; // auto-computed (end - start)
  room: string;
  type: 'Lecture' | 'Lab' | 'Tutorial';
};

export type AttendanceOverview = {
  overallPercent: number;
  sessionsRecorded: number;
  byClass: { label: string; percent: number; sessions: number }[];
};

export type AttendanceStatus = 'present' | 'absent' | 'late';

export type AttendanceEntry = {
  studentId: string;
  status: AttendanceStatus;
};

export type AttendanceRecord = {
  id: string;
  classId: string; // ClassSession.id
  date: string; // YYYY-MM-DD
  period: number;
  entries: AttendanceEntry[];
};

export type FeeInvoice = {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  term: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'due' | 'overdue' | 'pending';
  paidOn?: string;
};

export type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'cash' | 'cheque' | 'other';

export type Book = {
  id: string;
  title: string;
  author: string;
  category: string;
  isbn?: string;
  copies: number;
  available: number;
};

export type BookLoan = {
  id: string;
  bookId: string;
  bookTitle: string;
  studentId: string;
  studentName: string;
  issuedOn: string;
  dueOn: string;
  returnedOn?: string;
  status: 'active' | 'returned' | 'overdue';
};

export type HostelBlock = {
  id: string;
  name: string;
  warden: string;
  wardenPhone: string;
};

export type HostelRoom = {
  id: string;
  blockId: string;
  roomNo: string;
  capacity: number;
};

export type HostelAllocation = {
  id: string;
  studentId: string;
  studentName: string;
  roomId: string;
  bed: string;
  messPlan: string;
  fees: number;
};

export type BusRoute = {
  id: string;
  name: string;
  number: string;
  driver: string;
  driverPhone: string;
};

export type BusStop = {
  id: string;
  routeId: string;
  name: string;
  time: string;
  order: number;
};

export type BusLiveStatus = {
  id: string;
  routeId: string;
  currentStop: string;
  nextStop: string;
  etaMins: number;
  occupancy: number;
};

export type NotificationItem = {
  id: string;
  recipientId?: string;
  recipientName?: string;
  broadcastRole?: Role | '';
  title: string;
  body: string;
  category: 'academic' | 'fee' | 'event' | 'general' | 'alert' | 'attendance';
  read: boolean;
  sentAt: string;
};

export type AuditLog = {
  id: string;
  at: string;
  actor: string;
  action: 'create' | 'update' | 'delete' | 'broadcast';
  entity: string;
  detail: string;
};

export type AdminDashboard = {
  counts: {
    students: number;
    faculty: number;
    departments: number;
    courses: number;
    subjects: number;
    feeInvoices: number;
    notifications: number;
  };
  recentAudits: AuditLog[];
};

// ---------- Exams & Results ----------
// Must match the backend Exam.TYPE_CHOICES exactly (capitalized), or POST /exams
// rejects with "… is not a valid choice."
export type ExamType = 'Internal' | 'Semester' | 'Quiz';

export type Exam = {
  id: string;
  subjectId: string;
  subjectCode?: string;
  subjectName?: string;
  name: string;
  date: string;
  time: string;
  room: string;
  durationMins: number;
  type: ExamType;
};

export type ExamResult = {
  id: string;
  studentId: string;
  studentName?: string;
  subjectId: string;
  subjectName?: string;
  examRef?: string;
  exam: string;
  marks: number;
  maxMarks: number;
  grade: string;
  gradePoint: number;
  credits: number;
};

// ---------- Assignments & Materials ----------
export type AssignmentStatus = 'pending' | 'submitted' | 'graded' | 'late';

export type Assignment = {
  id: string;
  subjectId: string;
  subjectCode?: string;
  subjectName?: string;
  title: string;
  description: string;
  dueDate: string;
  maxMarks: number;
  status: AssignmentStatus;
};

// Mirrors the backend Material KIND_CHOICES (note/video/slide/link). `pdf` is retained for
// legacy/seed rows only — new uploads use `slide` for PDFs and decks (the backend has no `pdf`).
export type MaterialKind = 'note' | 'pdf' | 'slide' | 'link' | 'video';

export type Material = {
  id: string;
  subjectId: string;
  title: string;
  kind: MaterialKind;
  sizeLabel?: string;
  url: string;
  addedAt: string;
};

// ---------- Quizzes ----------
export type QuizQuestion = {
  id: string;
  q: string;
  options: string[];
  answerIndex: number;
};

export type Quiz = {
  id: string;
  subjectId: string;
  title: string;
  questions: QuizQuestion[];
};

// ---------- Placements ----------
export type PlacementOpening = {
  id: string;
  company: string;
  role: string;
  ctc: number;
  location: string;
  eligibility: string;
  lastDate: string;
  logoColor: string;
  isActive: boolean;
};

export type PlacementApplication = {
  id: string;
  openingId: string;
  companyRole: string;
  studentId: string;
  studentName: string;
  status: 'applied' | 'shortlisted' | 'selected' | 'rejected';
  appliedOn: string;
};

// ---------- Events ----------
export type EventCategory = 'tech' | 'cultural' | 'sports' | 'workshop';

export type EventItem = {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  category: EventCategory;
  description?: string;
};

// ---------- Complaints ----------
export type ComplaintStatus = 'open' | 'in_progress' | 'resolved';

export type Complaint = {
  id: string;
  studentId?: string;
  studentName?: string;
  category: string;
  subject: string;
  description: string;
  status: ComplaintStatus;
  createdOn: string;
};

// ---------- Leave ----------
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export type LeaveRequest = {
  id: string;
  studentId: string;
  studentName?: string;
  type: 'sick' | 'casual' | 'event';
  fromDate: string;
  toDate: string;
  reason: string;
  status: LeaveStatus;
  appliedOn: string;
};

// ---------- Certificates ----------
export type CertificateKind = 'course' | 'event' | 'achievement';

export type Certificate = {
  id: string;
  studentId: string;
  studentName?: string;
  title: string;
  issuer: string;
  issuedOn: string;
  kind: CertificateKind;
  url?: string;
};
