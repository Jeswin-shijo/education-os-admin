import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './router/ProtectedRoute';
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
        {/* Academics */}
        <Route path="/departments" element={<DepartmentsPage />} />
        <Route path="/programs" element={<ProgramsPage />} />
        <Route path="/semesters" element={<SemestersPage />} />
        <Route path="/sections" element={<SectionsPage />} />
        <Route path="/subjects" element={<SubjectsPage />} />
        <Route path="/timetable" element={<TimetablePage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/exams" element={<ExamsPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/assignments" element={<AssignmentsPage />} />
        <Route path="/materials" element={<MaterialsPage />} />
        <Route path="/quizzes" element={<QuizzesPage />} />
        {/* Campus */}
        <Route path="/fees" element={<FeesPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/hostel" element={<HostelPage />} />
        <Route path="/transport" element={<TransportPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/placements" element={<PlacementsPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/complaints" element={<ComplaintsPage />} />
        <Route path="/leave" element={<LeavePage />} />
        <Route path="/certificates" element={<CertificatesPage />} />
        {/* System */}
        <Route path="/audit-logs" element={<AuditLogsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
