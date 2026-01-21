import { useEffect, useState } from "react";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";
import FormModal from "../../components/FormModal";
import attendanceService from "../../services/attendanceService";

export default function AttendancePage() {
  const [records, setRecords] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    attendanceService.getAll().then(setRecords);
  }, []);

  async function handleAdd(payload) {
    await attendanceService.add(payload);
    attendanceService.getAll().then(setRecords);
    setModalOpen(false);
  }

  const columns = [
    { key: "date", label: "Date" },
    { key: "class", label: "Class" },
    { key: "present", label: "Present" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" subtitle="Daily attendance records" actions={<button onClick={() => setModalOpen(true)} className="px-4 py-2 rounded-xl bg-yellow-500 text-white">Mark Attendance</button>} />

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <DataTable columns={columns} data={records} />
      </div>

      <FormModal
        open={modalOpen}
        title="Add Attendance"
        onClose={() => setModalOpen(false)}
        onSubmit={handleAdd}
        fields={[{ name: "date", label: "Date", type: "date" }, { name: "class", label: "Class" }, { name: "present", label: "Present (count)", type: "number" }]}
      />
    </div>
  );
}
