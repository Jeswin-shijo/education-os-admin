import { http } from './http';
import { fromSource } from './source';

// =====================================================================================
// Attendance analytics — college-wide attendance broken down four ways for the
// staff/admin Overview. Backend: GET /api/v1/attendance/analytics (staff/admin only)
//   data: { overall_percent, by_department:[{code,name,percent}],
//           by_program:[{code,name,percent}], by_faculty:[{id,name,percent}] }
// The real arm maps snake_case → camelCase and normalises each breakdown into a
// common { key, label, percent } row so the page can render them uniformly.
// =====================================================================================

/** One row in a breakdown bar list (a department, program or faculty member). */
export type AttendanceBreakdownRow = {
  key: string;
  label: string;
  percent: number;
};

export type AttendanceAnalytics = {
  overallPercent: number;
  byDepartment: AttendanceBreakdownRow[];
  byProgram: AttendanceBreakdownRow[];
  byFaculty: AttendanceBreakdownRow[];
};

type BreakdownApi = { code?: string; id?: string; name?: string; percent?: number };
type AnalyticsApi = {
  overall_percent?: number;
  by_department?: BreakdownApi[];
  by_program?: BreakdownApi[];
  by_faculty?: BreakdownApi[];
};

function mapRow(r: BreakdownApi): AttendanceBreakdownRow {
  return {
    key: r.code ?? r.id ?? r.name ?? '',
    label: r.name ?? r.code ?? '—',
    percent: Math.round(r.percent ?? 0),
  };
}

// Small representative sample for standalone/demo mode — a mix of healthy, at-risk
// and low values so the value-based colouring is visible.
const MOCK: AttendanceAnalytics = {
  overallPercent: 84,
  byDepartment: [
    { key: 'CSE', label: 'Computer Science & Engineering', percent: 89 },
    { key: 'ECE', label: 'Electronics & Communication', percent: 82 },
    { key: 'MECH', label: 'Mechanical Engineering', percent: 71 },
    { key: 'CIVIL', label: 'Civil Engineering', percent: 64 },
    { key: 'BBA', label: 'Business Administration', percent: 57 },
  ],
  byProgram: [
    { key: 'BTECH-CSE', label: 'B.Tech CSE', percent: 90 },
    { key: 'BTECH-ECE', label: 'B.Tech ECE', percent: 81 },
    { key: 'MBA', label: 'MBA', percent: 76 },
    { key: 'BCA', label: 'BCA', percent: 68 },
    { key: 'BCOM', label: 'B.Com', percent: 59 },
  ],
  byFaculty: [
    { key: 'f-01', label: 'Dr. Anita Rao', percent: 92 },
    { key: 'f-02', label: 'Prof. Vikram Nair', percent: 85 },
    { key: 'f-03', label: 'Dr. Meera Joseph', percent: 78 },
    { key: 'f-04', label: 'Prof. Sanjay Gupta', percent: 66 },
    { key: 'f-05', label: 'Dr. Farah Khan', percent: 55 },
  ],
};

/** College-wide attendance analytics for the staff/admin Overview. */
export async function analytics(): Promise<AttendanceAnalytics> {
  return fromSource(
    async () => MOCK,
    async () => {
      const data = await http.get<AnalyticsApi>('/api/v1/attendance/analytics');
      return {
        overallPercent: Math.round(data.overall_percent ?? 0),
        byDepartment: (data.by_department ?? []).map(mapRow),
        byProgram: (data.by_program ?? []).map(mapRow),
        byFaculty: (data.by_faculty ?? []).map(mapRow),
      };
    },
  );
}
