import { useState, useMemo, useEffect } from "react";
import { Plus, Users } from "lucide-react";
import PageHeader from "../../components/PageHeader";
import StatCard from "../../components/StatCard";
import DataTable from "../../components/DataTable";
import FormModal from "../../components/FormModal";
import studentService from "../../services/studentService";

export default function StudentsPage() {
  const [students, setStudents] = useState([]);

  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    // load students from service (localStorage)
    studentService.getAll().then((list) => {
      if (!list || list.length === 0) {
        // seed sample data if empty
        studentService.resetWithSample().then(setStudents);
      } else setStudents(list);
    });
  }, []);

  const columns = useMemo(
    () => [
      { key: "id", label: "ID" },
      { key: "firstName", label: "First" },
      { key: "lastName", label: "Last" },
      { key: "class", label: "Class" },
      { key: "age", label: "Age" },
      { key: "parent", label: "Parent" },
    ],
    []
  );

  const filtered = useMemo(() => {
    if (!query) return students;
    const q = query.toLowerCase();
    return students.filter(
      (s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.parent.toLowerCase().includes(q) ||
        s.class.toLowerCase().includes(q)
    );
  }, [students, query]);

  async function handleAddStudent(payload) {
    const added = await studentService.add(payload);
    setStudents((p) => [added, ...p]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        subtitle={`Manage students, classes & guardians`}
        actions={
          <div className="flex items-center gap-3">
            <div className="hidden md:block w-80">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, id, class or parent..."
                className="w-full px-3 py-2 rounded-xl bg-white border focus:outline-none"
              />
            </div>

            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl shadow hover:bg-violet-700"
            >
              <Plus size={16} /> Add Student
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1">
          <StatCard
            title="Total Students"
            value={students.length}
            subtitle="All registered students"
            icon={Users}
            gradient="linear-gradient(135deg,#00B894,#55EFC4)"
          />
        </div>
        <div className="md:col-span-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <DataTable columns={columns} data={filtered} />
          </div>
        </div>
      </div>

      <FormModal
        open={modalOpen}
        title="Add Student"
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddStudent}
        fields={[
          { name: "firstName", label: "First Name", type: "text" },
          { name: "lastName", label: "Last Name", type: "text" },
          { name: "class", label: "Class", type: "text" },
          { name: "age", label: "Age", type: "number" },
          { name: "parent", label: "Parent / Guardian", type: "text" },
        ]}
      />
    </div>
  );
}
