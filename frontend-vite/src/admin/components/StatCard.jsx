export default function StatCard({ title, value, subtitle, icon: Icon, gradient }) {
  return (
    <div
      className="rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition transform hover:-translate-y-0.5"
      style={{ background: gradient }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm opacity-90">{title}</div>
          <div className="text-3xl font-extrabold mt-2">{value}</div>
          {subtitle && <div className="text-xs mt-2 opacity-90">{subtitle}</div>}
        </div>

        {Icon && (
          <div className="bg-white/20 rounded-2xl p-3">
            <Icon size={22} />
          </div>
        )}
      </div>
    </div>
  );
}
