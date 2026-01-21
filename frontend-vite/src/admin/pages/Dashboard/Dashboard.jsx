import StatCard from "../../components/StatCard";
import ChartCard from "../../components/ChartCard";
import { THEME } from "../../theme/theme";
import { GraduationCap, Users, CalendarCheck2, Wallet } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const attendanceData = [
  { day: "Mon", present: 80 },
  { day: "Tue", present: 92 },
  { day: "Wed", present: 88 },
  { day: "Thu", present: 95 },
  { day: "Fri", present: 90 },
];

const feesData = [
  { month: "Aug", paid: 40 },
  { month: "Sep", paid: 55 },
  { month: "Oct", paid: 70 },
  { month: "Nov", paid: 65 },
  { month: "Dec", paid: 80 },
];

const recentAdmissions = [
  { name: "Ayaan Rahman", cls: "KG-1", status: "Active" },
  { name: "Sara Islam", cls: "KG-2", status: "Pending Fees" },
  { name: "Nafisa Hasan", cls: "KG-1", status: "Active" },
  { name: "Rafi Ahmed", cls: "KG-2", status: "Inactive" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">

      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm">Insights, analytics and quick actions</p>
        </div>

        <button className="px-4 py-2 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 shadow-sm">
          + Create Notice
        </button>
      </div>

      {/* TOP CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          title="Students"
          value="120"
          subtitle="Total enrolled"
          icon={GraduationCap}
          gradient={THEME.cards.students}
        />
        <StatCard
          title="Teachers"
          value="12"
          subtitle="Active staff"
          icon={Users}
          gradient={THEME.cards.teachers}
        />
        <StatCard
          title="Attendance"
          value="92%"
          subtitle="Today"
          icon={CalendarCheck2}
          gradient={THEME.cards.attendance}
        />
        <StatCard
          title="Fees Collected"
          value="৳80k"
          subtitle="This month"
          icon={Wallet}
          gradient={THEME.cards.income}
        />
      </div>

      {/* CHARTS + TABLE GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        <div className="xl:col-span-2 space-y-5">
          <ChartCard
            title="Attendance Trend"
            right={<span className="text-xs text-slate-500">Last 5 days</span>}
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceData}>
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="present"
                    stroke={THEME.charts.green}
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard
            title="Fees Collection"
            right={<span className="text-xs text-slate-500">Last 5 months</span>}
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={feesData}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="paid" fill={THEME.charts.purple} radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* RIGHT PANEL */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl p-5 border shadow-sm">
            <div className="font-bold text-slate-800 mb-3">Quick Actions</div>
            <div className="space-y-2">
              <button className="w-full text-left px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 font-semibold">
                + Add Student
              </button>
              <button className="w-full text-left px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 font-semibold">
                Import Students (CSV/Excel)
              </button>
              <button className="w-full text-left px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 font-semibold">
                Mark Attendance
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border shadow-sm">
            <div className="font-bold text-slate-800 mb-3">Recent Admissions</div>

            <div className="space-y-3">
              {recentAdmissions.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">{s.name}</div>
                    <div className="text-xs text-slate-500">{s.cls}</div>
                  </div>

                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      s.status === "Active"
                        ? "bg-green-100 text-green-700"
                        : s.status === "Pending Fees"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
