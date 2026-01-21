import React, { useState, useEffect } from "react";

export default function FormModal({ open, title, onClose, onSubmit, fields = [] }) {
	const initial = fields.reduce((acc, f) => ({ ...acc, [f.name]: f.default ?? "" }), {});
	const [form, setForm] = useState(initial);

	useEffect(() => {
		setForm(initial);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	function handleChange(e) {
		const { name, value } = e.target;
		setForm((s) => ({ ...s, [name]: value }));
	}

	function submit(e) {
		e.preventDefault();
		// basic validation: require firstName
		onSubmit(form);
	}

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-black/40" onClick={onClose} />

			<div className="relative bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-bold">{title}</h3>
					<button onClick={onClose} className="text-slate-500">Close</button>
				</div>

				<form onSubmit={submit} className="space-y-3">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						{fields.map((f) => (
							<div key={f.name}>
								<label className="text-xs text-slate-600">{f.label}</label>
								<input
									name={f.name}
									type={f.type || "text"}
									value={form[f.name] ?? ""}
									onChange={handleChange}
									className="mt-1 w-full px-3 py-2 border rounded-lg outline-none"
								/>
							</div>
						))}
					</div>

					<div className="flex items-center justify-end gap-3 pt-2">
						<button type="button" onClick={onClose} className="px-4 py-2 rounded-xl">
							Cancel
						</button>
						<button type="submit" className="px-4 py-2 rounded-xl bg-violet-600 text-white">
							Save
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
