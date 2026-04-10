'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

interface ResultBatchManagerProps {
  examCycleId: string;
}

interface BatchItem {
  _id: string;
  examCycleId?: { examName?: string };
  classId?: { name?: string; classId?: string; grade?: string };
  subjectId?: { name?: string };
  teacherId?: { name?: string; email?: string };
  status: string;
  totalStudents: number;
  entriesCompleted: number;
  updatedAt: string;
}

interface AuditLogItem {
  _id: string;
  entityType: string;
  action: string;
  reason: string;
  changedFields: string[];
  createdAt: string;
  changedBy?: {
    _id: string;
    name: string;
    role?: string;
    email?: string;
  } | null;
  student?: {
    _id: string;
    name: string;
    rollNumber?: string;
  } | null;
}

const ACTION_BY_STATUS: Record<string, string[]> = {
  submitted: ['approve'],
  approved: ['publish'],
  published: ['lock'],
  reopened: ['publish'],
};

const ACTION_SUCCESS_LABEL: Record<string, string> = {
  approve: 'approved',
  publish: 'published',
  lock: 'locked',
};

function actionBadge(action: string) {
  switch (action) {
    case 'create':
      return 'bg-emerald-100 text-emerald-700';
    case 'update':
      return 'bg-amber-100 text-amber-700';
    case 'delete':
      return 'bg-rose-100 text-rose-700';
    case 'submit':
      return 'bg-blue-100 text-blue-700';
    case 'approve':
      return 'bg-violet-100 text-violet-700';
    case 'publish':
      return 'bg-slate-900 text-white';
    case 'lock':
      return 'bg-slate-200 text-slate-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export default function ResultBatchManager({ examCycleId }: ResultBatchManagerProps) {
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTone, setStatusTone] = useState<'success' | 'error'>('success');
  const [actingBatchId, setActingBatchId] = useState('');
  const [historyBatch, setHistoryBatch] = useState<BatchItem | null>(null);
  const [historyLogs, setHistoryLogs] = useState<AuditLogItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadBatches = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/admin/marksheets?examCycleId=${examCycleId}`);
      if (response.data?.success) {
        setBatches(Array.isArray(response.data.data) ? response.data.data : []);
      }
    } catch (err: any) {
      setStatusTone('error');
      setStatusMessage(err.response?.data?.error || 'Failed to load marksheet batches');
    } finally {
      setLoading(false);
    }
  }, [examCycleId]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  const loadHistory = async (batch: BatchItem) => {
    try {
      setHistoryBatch(batch);
      setHistoryLoading(true);
      const response = await axios.get(`/api/admin/marksheets/${batch._id}/audit`);
      if (response.data?.success) {
        setHistoryLogs(Array.isArray(response.data.data) ? response.data.data : []);
      }
    } catch (err: any) {
      setStatusTone('error');
      setStatusMessage(err.response?.data?.error || 'Failed to load batch history');
      setHistoryLogs([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const runAction = async (batchId: string, action: string) => {
    try {
      setActingBatchId(batchId);
      setStatusMessage('');
      await axios.patch(`/api/admin/marksheets/${batchId}`, { action });
      setStatusTone('success');
      setStatusMessage(`Batch ${ACTION_SUCCESS_LABEL[action] || action} successfully`);
      await loadBatches();
    } catch (err: any) {
      setStatusTone('error');
      setStatusMessage(err.response?.data?.error || `Failed to ${action} batch`);
    } finally {
      setActingBatchId('');
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Approval and Publishing</h3>
          <p className="text-sm text-slate-500">
            Review submitted marksheet batches and publish final report cards from here.
          </p>
        </div>
        <button
          type="button"
          onClick={loadBatches}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
        >
          Refresh
        </button>
      </div>

      {statusMessage && (
        <div
          className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
            statusTone === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {statusMessage}
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
          Loading marksheet batches...
        </div>
      ) : batches.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
          No marksheet batches have been created for this exam cycle yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-3 text-left font-semibold">Class</th>
                <th className="px-3 py-3 text-left font-semibold">Subject</th>
                <th className="px-3 py-3 text-left font-semibold">Teacher</th>
                <th className="px-3 py-3 text-left font-semibold">Progress</th>
                <th className="px-3 py-3 text-left font-semibold">Status</th>
                <th className="px-3 py-3 text-left font-semibold">Updated</th>
                <th className="px-3 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => {
                const actions = ACTION_BY_STATUS[batch.status] || [];

                return (
                  <tr key={batch._id} className="border-t">
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-900">{batch.classId?.name || '-'}</div>
                      <div className="text-xs text-slate-500">
                        {batch.classId?.classId || batch.classId?.grade || '-'}
                      </div>
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-900">
                      {batch.subjectId?.name || '-'}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-900">{batch.teacherId?.name || '-'}</div>
                      <div className="text-xs text-slate-500">{batch.teacherId?.email || ''}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {batch.entriesCompleted} / {batch.totalStudents}
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                        {batch.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-500">
                      {new Date(batch.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => loadHistory(batch)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700"
                        >
                          History
                        </button>
                        {actions.length === 0 ? (
                          <span className="text-xs text-slate-400">No actions</span>
                        ) : (
                          actions.map((action) => (
                            <button
                              key={action}
                              type="button"
                              onClick={() => runAction(batch._id, action)}
                              disabled={actingBatchId === batch._id}
                              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-60"
                            >
                              {actingBatchId === batch._id ? 'Working...' : action}
                            </button>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {historyBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h4 className="text-lg font-bold text-slate-900">Batch History</h4>
                <p className="text-sm text-slate-500">
                  {historyBatch.classId?.name || '-'} | {historyBatch.subjectId?.name || '-'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHistoryBatch(null);
                  setHistoryLogs([]);
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
              >
                Close
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
              {historyLoading ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
                  Loading audit history...
                </div>
              ) : historyLogs.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
                  No audit history found for this batch.
                </div>
              ) : (
                <div className="space-y-3">
                  {historyLogs.map((log) => (
                    <div key={log._id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${actionBadge(log.action)}`}>
                              {log.action}
                            </span>
                            <span className="text-sm font-semibold text-slate-900">
                              {log.student ? `${log.student.name}${log.student.rollNumber ? ` (${log.student.rollNumber})` : ''}` : 'Batch event'}
                            </span>
                          </div>
                          <div className="mt-2 text-sm text-slate-600">
                            {log.reason || 'No reason recorded'}
                          </div>
                          {log.changedFields?.length > 0 && (
                            <div className="mt-2 text-xs text-slate-500">
                              Fields: {log.changedFields.join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="text-right text-xs text-slate-500">
                          <div>{new Date(log.createdAt).toLocaleString()}</div>
                          <div className="mt-1">
                            {log.changedBy?.name || 'Unknown user'}
                            {log.changedBy?.role ? ` | ${log.changedBy.role}` : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
