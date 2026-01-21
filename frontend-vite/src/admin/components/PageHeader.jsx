import React from "react";

export default function PageHeader({ title, subtitle, actions }) {
	return (
		<div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
			<div>
				<div className="text-2xl font-extrabold text-slate-800 flex items-center gap-3">
					{title}
				</div>
				{subtitle && <div className="text-sm text-slate-500 mt-1">{subtitle}</div>}
			</div>

			<div className="ml-auto">{actions}</div>
		</div>
	);
}
