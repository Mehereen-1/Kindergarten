"use client";

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useEffect, useState } from 'react';

type ClassOption = {
  _id: string;
  name: string;
  grade: string;
};

const activityFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, { message: 'Title must be at least 2 characters.' })
    .max(120, { message: 'Title must be at most 120 characters.' }),
  description: z
    .string()
    .trim()
    .min(1, { message: 'Description is required.' })
    .max(1000, { message: 'Description must be at most 1000 characters.' }),
  subject: z
    .string()
    .trim()
    .min(2, { message: 'Subject must be at least 2 characters.' })
    .max(80, { message: 'Subject must be at most 80 characters.' }),
  date: z.string().min(1, { message: 'Date is required.' }),
  classId: z.string().min(1, { message: 'Class is required.' }),
});

type ActivityFormInputs = z.infer<typeof activityFormSchema>;

type ActivityFormProps = {
  createdBy: string;
  defaultValues?: Partial<ActivityFormInputs>;
  onCreated?: (activity: unknown) => void;
};

function toIsoDateString(date: string) {
  return new Date(`${date}T00:00:00.000Z`).toISOString();
}

export default function ActivityForm({
  createdBy,
  defaultValues,
  onCreated,
}: ActivityFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassOption[]>([]);

  useEffect(() => {
    fetch('/api/admin/classes')
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setClasses(list.map((c: { _id: string; name: string; grade: string }) => ({
          _id: c._id,
          name: c.name,
          grade: c.grade,
        })));
      })
      .catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ActivityFormInputs>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      title: defaultValues?.title || '',
      description: defaultValues?.description || '',
      subject: defaultValues?.subject || '',
      date: defaultValues?.date || '',
      classId: defaultValues?.classId || '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const response = await fetch('/api/activities/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          date: toIsoDateString(values.date),
          createdBy,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create activity.');
      }

      setSubmitSuccess('Activity created successfully.');
      reset({ title: '', description: '', subject: '', date: '', classId: '' });

      if (onCreated) {
        onCreated(data);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      setSubmitError(message);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Create Activity</h2>
        <p className="mt-1 text-sm text-slate-600">
          Add a classroom activity for a specific class.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-700">
            Title
          </label>
          <input
            id="title"
            type="text"
            placeholder="e.g., Alphabet Matching"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            {...register('title')}
          />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
        </div>

        <div className="md:col-span-2">
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            placeholder="Briefly explain the activity goals and instructions"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            {...register('description')}
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="classId" className="mb-1 block text-sm font-medium text-slate-700">
            Class
          </label>
          <select
            id="classId"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            {...register('classId')}
          >
            <option value="">Select a class</option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} — Grade {c.grade}
              </option>
            ))}
          </select>
          {errors.classId && <p className="mt-1 text-xs text-red-600">{errors.classId.message}</p>}
        </div>

        <div>
          <label htmlFor="subject" className="mb-1 block text-sm font-medium text-slate-700">
            Subject
          </label>
          <input
            id="subject"
            type="text"
            placeholder="e.g., English"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            {...register('subject')}
          />
          {errors.subject && <p className="mt-1 text-xs text-red-600">{errors.subject.message}</p>}
        </div>

        <div>
          <label htmlFor="date" className="mb-1 block text-sm font-medium text-slate-700">
            Activity Date
          </label>
          <input
            id="date"
            type="date"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            {...register('date')}
          />
          {errors.date && <p className="mt-1 text-xs text-red-600">{errors.date.message}</p>}
        </div>
      </div>

      {submitError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {submitError}
        </div>
      )}

      {submitSuccess && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {submitSuccess}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
      >
        {isSubmitting ? 'Creating...' : 'Create Activity'}
      </button>
    </form>
  );
}