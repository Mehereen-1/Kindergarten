import FormModal from "@/app/components/FormModal";
import Pagination from "@/app/components/Pagination";
import Table from "@/app/components/Table";
import TableSearch from "@/app/components/TableSearch";
import { role } from "@/lib/data";
import Image from "next/image";
import Link from "next/link";

/* ---------------- TYPES ---------------- */
type Teacher = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  subjects?: string[];
  classes?: string[];
  photo?: string;
};

/* ---------------- TABLE COLUMNS ---------------- */
const columns = [
  { header: "Info", accessor: "info" },
  {
    header: "Teacher ID",
    accessor: "teacherId",
    className: "hidden md:table-cell",
  },
  {
    header: "Subjects",
    accessor: "subjects",
    className: "hidden md:table-cell",
  },
  {
    header: "Classes",
    accessor: "classes",
    className: "hidden md:table-cell",
  },
  {
    header: "Phone",
    accessor: "phone",
    className: "hidden lg:table-cell",
  },
  {
    header: "Address",
    accessor: "address",
    className: "hidden lg:table-cell",
  },
  { header: "Actions", accessor: "action" },
];

/* ---------------- FETCH TEACHERS ---------------- */
const getTeachers = async () => {
  const res = await fetch("http://localhost:3000/api/teachers", {
    cache: "no-store",
  });

  if (!res.ok) throw new Error("Failed to fetch teachers");

  return res.json();
};

const TeacherListPage = async () => {
  const teachers: Teacher[] = await getTeachers();

  const renderRow = (item: Teacher) => (
    <tr
      key={item._id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">
        <Image
          src={
            item.photo ||
            "https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg"
          }
          alt=""
          width={40}
          height={40}
          className="md:hidden xl:block w-10 h-10 rounded-full object-cover"
        />
        <div className="flex flex-col">
          <h3 className="font-semibold">{item.name}</h3>
          <p className="text-xs text-gray-500">{item.email}</p>
        </div>
      </td>

      <td className="hidden md:table-cell">
        {item._id.slice(-6)}
      </td>

      <td className="hidden md:table-cell">
        {item.subjects?.join(", ") || "-"}
      </td>

      <td className="hidden md:table-cell">
        {item.classes?.join(", ") || "-"}
      </td>

      <td className="hidden lg:table-cell">
        {item.phone || "-"}
      </td>

      <td className="hidden lg:table-cell">
        {item.address || "-"}
      </td>

      <td>
        <div className="flex items-center gap-2">
          <Link href={`/list/teachers/${item._id}`}>
            <button className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaSky">
              <Image src="/view.png" alt="" width={16} height={16} />
            </button>
          </Link>

          {role === "admin" && (
            <FormModal
              table="teacher"
              type="delete"
              id={item._id}
            />
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          All Teachers
        </h1>

        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />

          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>

            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>

            {role === "admin" && (
              <FormModal table="teacher" type="create" />
            )}
          </div>
        </div>
      </div>

      {/* LIST */}
      <Table
        columns={columns}
        renderRow={renderRow}
        data={teachers}
      />

      {/* PAGINATION */}
      <Pagination />
    </div>
  );
};

export default TeacherListPage;
