"use client";

const ParentChildCard = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md hover:shadow-lg transition-all duration-500 group animate-in fade-in slide-in-from-left-5 duration-700">
      {/* Header */}
      <div className="h-24 bg-blue-600"></div>

      {/* Content */}
      <div className="px-8 py-6 relative -mt-12">
        <div className="flex items-start gap-6">
          {/* Child Avatar */}
          <div className="w-24 h-24 rounded-2xl bg-blue-100 flex items-center justify-center text-6xl shadow-md group-hover:scale-110 transition-transform">
            👦
          </div>

          {/* Child Info */}
          <div className="flex-1 pt-2">
            <h3 className="text-3xl font-black text-slate-900 drop-shadow-sm">Arjun Singh</h3>
            <div className="space-y-2 mt-4">
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Class</p>
                  <p className="text-lg font-bold text-blue-600">KG - A</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Roll No</p>
                  <p className="text-lg font-bold text-blue-600">15</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Teacher</p>
                  <p className="text-lg font-bold text-blue-600">Mrs. Sharma</p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="text-right">
            <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center text-white font-bold shadow-md group-hover:scale-110 transition-transform">
              <span className="text-2xl">✓</span>
            </div>
            <p className="text-sm font-bold text-green-600 mt-2">Present Today</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentChildCard;
