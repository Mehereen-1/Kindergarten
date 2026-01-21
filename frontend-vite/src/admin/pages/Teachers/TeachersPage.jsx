import { useEffect, useState } from "react";
import PageHeader from "../../components/PageHeader";
import StatCard from "../../components/StatCard";
import DataTable from "../../components/DataTable";
import FormModal from "../../components/FormModal";
import teacherService from "../../services/teacherService";
import { User, Users } from "lucide-react";

export default function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    teacherService.getAll().then(setTeachers);
  }, []);

  async function handleAdd(payload) {
    const t = await teacherService.add(payload);
    setTeachers((p) => [t, ...p]);
    setModalOpen(false);
  }

  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "subject", label: "Subject" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teachers"
        subtitle="Manage teaching staff"
        actions={<button onClick={() => setModalOpen(true)} className="px-4 py-2 rounded-xl bg-violet-600 text-white">+ Add</button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <StatCard title="Teachers" value={teachers.length} subtitle="Active staff" icon={Users} gradient="linear-gradient(135deg,#E17055,#FAB1A0)" />
        </div>
        <div className="md:col-span-3 bg-white rounded-2xl p-4 shadow-sm">
          <DataTable columns={columns} data={teachers} />
        </div>
      </div>

      <FormModal
        open={modalOpen}
        title="Add Teacher"
        onClose={() => setModalOpen(false)}
        onSubmit={handleAdd}
        fields={[{ name: "name", label: "Name" }, { name: "subject", label: "Subject" }]}
      />
    </div>
  );
}
