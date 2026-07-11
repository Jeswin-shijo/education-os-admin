import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './router/ProtectedRoute';
import { HubLayout } from './layout/HubLayout';
import { ACADEMIC_TABS, CONTENT_TABS, CAMPUS_TABS, STUDENT_LIFE_TABS } from './layout/navigation';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { StudentsPage } from './pages/people/StudentsPage';
import { FacultyPage } from './pages/people/FacultyPage';
import { ParentsPage } from './pages/people/ParentsPage';
import { UsersRolesPage } from './pages/people/UsersRolesPage';
import { DepartmentsPage } from './pages/academics/DepartmentsPage';
import { ProgramsPage } from './pages/academics/ProgramsPage';
import { SemestersPage } from './pages/academics/SemestersPage';
import { SectionsPage } from './pages/academics/SectionsPage';
import { SubjectsPage } from './pages/academics/SubjectsPage';
import { TimetablePage } from './pages/academics/TimetablePage';
import { AttendancePage } from './pages/academics/AttendancePage';
import { ExamsPage } from './pages/academics/ExamsPage';
import { ResultsPage } from './pages/academics/ResultsPage';
import { AssignmentsPage } from './pages/academics/AssignmentsPage';
import { MaterialsPage } from './pages/academics/MaterialsPage';
import { QuizzesPage } from './pages/academics/QuizzesPage';
import { FeesPage } from './pages/campus/FeesPage';
import { LibraryPage } from './pages/campus/LibraryPage';
import { HostelPage } from './pages/campus/HostelPage';
import { TransportPage } from './pages/campus/TransportPage';
import { NotificationsPage } from './pages/campus/NotificationsPage';
import { PlacementsPage } from './pages/campus/PlacementsPage';
import { EventsPage } from './pages/campus/EventsPage';
import { ComplaintsPage } from './pages/campus/ComplaintsPage';
import { LeavePage } from './pages/campus/LeavePage';
import { CertificatesPage } from './pages/campus/CertificatesPage';
import { AuditLogsPage } from './pages/AuditLogsPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />

        {/* People */}
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/faculty" element={<FacultyPage />} />
        <Route path="/parents" element={<ParentsPage />} />
        <Route path="/users" element={<UsersRolesPage />} />

        {/* Academics — structural config grouped under one tabbed hub */}
        <Route
          path="/academics"
          element={
            <HubLayout
              title="Academic Structure"
              blurb="Set up the academic hierarchy — departments, programs, semesters, sections and subjects."
              tabs={ACADEMIC_TABS}
            />
          }
        >
          <Route index element={<Navigate to="/academics/departments" replace />} />
          <Route path="departments" element={<DepartmentsPage />} />
          <Route path="programs" element={<ProgramsPage />} />
          <Route path="semesters" element={<SemestersPage />} />
          <Route path="sections" element={<SectionsPage />} />
          <Route path="subjects" element={<SubjectsPage />} />
        </Route>
        <Route path="/timetable" element={<TimetablePage />} />
        <Route path="/attendance" element={<AttendancePage />} />

        {/* Teaching & Content — term artefacts grouped under one tabbed hub */}
        <Route
          path="/content"
          element={
            <HubLayout
              title="Teaching & Content"
              blurb="Manage exams, results, assignments, materials and quizzes for the term."
              tabs={CONTENT_TABS}
            />
          }
        >
          <Route index element={<Navigate to="/content/exams" replace />} />
          <Route path="exams" element={<ExamsPage />} />
          <Route path="results" element={<ResultsPage />} />
          <Route path="assignments" element={<AssignmentsPage />} />
          <Route path="materials" element={<MaterialsPage />} />
          <Route path="quizzes" element={<QuizzesPage />} />
        </Route>

        {/* Campus — operations & facilities grouped under one tabbed hub */}
        <Route
          path="/campus"
          element={
            <HubLayout
              title="Campus Services"
              blurb="Run day-to-day campus operations — fees, library, hostel, transport and notices."
              tabs={CAMPUS_TABS}
            />
          }
        >
          <Route index element={<Navigate to="/campus/fees" replace />} />
          <Route path="fees" element={<FeesPage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="hostel" element={<HostelPage />} />
          <Route path="transport" element={<TransportPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>

        {/* Student Life — student-facing services grouped under one tabbed hub */}
        <Route
          path="/student-life"
          element={
            <HubLayout
              title="Student Life"
              blurb="Handle student-facing services — placements, events, complaints, leave and certificates."
              tabs={STUDENT_LIFE_TABS}
            />
          }
        >
          <Route index element={<Navigate to="/student-life/placements" replace />} />
          <Route path="placements" element={<PlacementsPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="complaints" element={<ComplaintsPage />} />
          <Route path="leave" element={<LeavePage />} />
          <Route path="certificates" element={<CertificatesPage />} />
        </Route>

        {/* System */}
        <Route path="/audit-logs" element={<AuditLogsPage />} />

        {/* Redirects: keep old flat URLs (bookmarks, deep links) working */}
        <Route path="/departments" element={<Navigate to="/academics/departments" replace />} />
        <Route path="/programs" element={<Navigate to="/academics/programs" replace />} />
        <Route path="/semesters" element={<Navigate to="/academics/semesters" replace />} />
        <Route path="/sections" element={<Navigate to="/academics/sections" replace />} />
        <Route path="/subjects" element={<Navigate to="/academics/subjects" replace />} />
        <Route path="/exams" element={<Navigate to="/content/exams" replace />} />
        <Route path="/results" element={<Navigate to="/content/results" replace />} />
        <Route path="/assignments" element={<Navigate to="/content/assignments" replace />} />
        <Route path="/materials" element={<Navigate to="/content/materials" replace />} />
        <Route path="/quizzes" element={<Navigate to="/content/quizzes" replace />} />
        <Route path="/fees" element={<Navigate to="/campus/fees" replace />} />
        <Route path="/library" element={<Navigate to="/campus/library" replace />} />
        <Route path="/hostel" element={<Navigate to="/campus/hostel" replace />} />
        <Route path="/transport" element={<Navigate to="/campus/transport" replace />} />
        <Route path="/notifications" element={<Navigate to="/campus/notifications" replace />} />
        <Route path="/placements" element={<Navigate to="/student-life/placements" replace />} />
        <Route path="/events" element={<Navigate to="/student-life/events" replace />} />
        <Route path="/complaints" element={<Navigate to="/student-life/complaints" replace />} />
        <Route path="/leave" element={<Navigate to="/student-life/leave" replace />} />
        <Route path="/certificates" element={<Navigate to="/student-life/certificates" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
