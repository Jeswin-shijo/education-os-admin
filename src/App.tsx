import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './router/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { StudentsPage } from './pages/people/StudentsPage';
import { FacultyPage } from './pages/people/FacultyPage';
import { ParentsPage } from './pages/people/ParentsPage';
import { UsersRolesPage } from './pages/people/UsersRolesPage';
import { DepartmentsPage } from './pages/academics/DepartmentsPage';
import { CoursesPage } from './pages/academics/CoursesPage';
import { SubjectsPage } from './pages/academics/SubjectsPage';
import { TimetablePage } from './pages/academics/TimetablePage';
import { AttendancePage } from './pages/academics/AttendancePage';
import { FeesPage } from './pages/campus/FeesPage';
import { LibraryPage } from './pages/campus/LibraryPage';
import { HostelPage } from './pages/campus/HostelPage';
import { TransportPage } from './pages/campus/TransportPage';
import { NotificationsPage } from './pages/campus/NotificationsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/faculty" element={<FacultyPage />} />
        <Route path="/parents" element={<ParentsPage />} />
        <Route path="/users" element={<UsersRolesPage />} />
        <Route path="/departments" element={<DepartmentsPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/subjects" element={<SubjectsPage />} />
        <Route path="/timetable" element={<TimetablePage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/fees" element={<FeesPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/hostel" element={<HostelPage />} />
        <Route path="/transport" element={<TransportPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/audit-logs" element={<AuditLogsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
