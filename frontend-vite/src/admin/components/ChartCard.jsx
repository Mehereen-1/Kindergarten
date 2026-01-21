export default function ChartCard({ title, right, children }) {
  return (
    <div className="bg-white rounded-2xl p-5 border shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="font-bold text-slate-800">{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}
