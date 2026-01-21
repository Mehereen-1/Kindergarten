import { useEffect, useState } from "react";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";
import FormModal from "../../components/FormModal";
import feesService from "../../services/feesService";

export default function FeesPage() {
  const [items, setItems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    feesService.getAll().then(setItems);
  }, []);

  async function handleAdd(payload) {
    const added = await feesService.add(payload);
    setItems((p) => [added, ...p]);
    setModalOpen(false);
  }

  const columns = [
    { key: "id", label: "ID" },
    { key: "student", label: "Student" },
    { key: "amount", label: "Amount" },
    { key: "date", label: "Date" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Fees" subtitle="Manage fee payments" actions={<button onClick={() => setModalOpen(true)} className="px-4 py-2 rounded-xl bg-rose-600 text-white">+ Add Payment</button>} />

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <DataTable columns={columns} data={items} />
      </div>

      <FormModal
        open={modalOpen}
        title="Add Fee Payment"
        onClose={() => setModalOpen(false)}
        onSubmit={handleAdd}
        fields={[{ name: "student", label: "Student" }, { name: "amount", label: "Amount", type: "number" }, { name: "date", label: "Date", type: "date" }]}
      />
    </div>
  );
}
