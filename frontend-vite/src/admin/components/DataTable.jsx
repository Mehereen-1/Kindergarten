import React from "react";

export default function DataTable({ columns = [], data = [] }) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full table-auto border-collapse">
				<thead>
					<tr className="text-sm text-slate-500 text-left">
						{columns.map((c) => (
							<th key={c.key} className="px-3 py-3">
								{c.label}
							</th>
						))}
					</tr>
				</thead>

				<tbody>
					{data.length === 0 ? (
						<tr>
							<td colSpan={columns.length} className="py-8 text-center text-slate-400">
								No records found
							</td>
						</tr>
					) : (
						data.map((row) => (
							<tr key={row.id} className="border-t">
								{columns.map((c) => (
									<td key={c.key} className="px-3 py-4 align-top">
										{row[c.key]}
									</td>
								))}
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}
