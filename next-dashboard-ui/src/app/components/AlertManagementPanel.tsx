'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Zap, TrendingDown } from 'lucide-react';

export default function AlertManagementPanel({ classId }: any) {
  const [alerts, setAlerts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    fetchAlerts();
  }, [classId]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      let url = `/api/ildce/analytics/alerts?classId=${classId}`;
      if (filter !== 'all') url += `&severity=${filter}`;

      const response = await fetch(url);

      if (!response.ok) throw new Error('Failed to fetch alerts');

      const data = await response.json();
      setAlerts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filter]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 flex items-center justify-center">
        <div className="animate-pulse">Loading alerts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <AlertTriangle className="text-red-600 inline mr-2" />
        {error}
      </div>
    );
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'declining':
        return <TrendingDown className="text-red-600" size={24} />;
      case 'low_engagement':
        return <Zap className="text-yellow-600" size={24} />;
      case 'difficulty_rise':
        return <AlertTriangle className="text-orange-600" size={24} />;
      case 'low_mastery':
        return <AlertTriangle className="text-red-600" size={24} />;
      default:
        return <AlertTriangle className="text-gray-600" size={24} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 border-red-300 text-red-900';
      case 'medium':
        return 'bg-yellow-100 border-yellow-300 text-yellow-900';
      case 'low':
        return 'bg-blue-100 border-blue-300 text-blue-900';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-900';
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">High Severity</p>
          <p className="text-3xl font-bold text-red-600">{alerts?.alertCounts?.high || 0}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Medium Severity</p>
          <p className="text-3xl font-bold text-yellow-600">{alerts?.alertCounts?.medium || 0}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Low Severity</p>
          <p className="text-3xl font-bold text-blue-600">{alerts?.alertCounts?.low || 0}</p>
        </div>
        <div className={`${alerts?.requiresAction ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} border rounded-lg p-4`}>
          <p className="text-sm text-gray-600 mb-1">Total Alerts</p>
          <p className={`text-3xl font-bold ${alerts?.requiresAction ? 'text-red-600' : 'text-green-600'}`}>
            {alerts?.alertCounts?.total || 0}
          </p>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All Alerts
        </button>
        <button
          onClick={() => setFilter('high')}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            filter === 'high'
              ? 'bg-red-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          High Only
        </button>
        <button
          onClick={() => setFilter('medium')}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            filter === 'medium'
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Medium Only
        </button>
        <button
          onClick={() => setFilter('low')}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            filter === 'low'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Low Only
        </button>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {alerts?.alerts && alerts.alerts.length > 0 ? (
          alerts.alerts.map((alert: any, idx: number) => (
            <div
              key={idx}
              className={`border-l-4 rounded-lg p-4 ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getAlertIcon(alert.alert_type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-lg">
                      {alert.alert_type === 'declining' && '📉 Student Declining'}
                      {alert.alert_type === 'low_engagement' && '⚡ Low Engagement'}
                      {alert.alert_type === 'difficulty_rise' && '📈 Difficulty Rising'}
                      {alert.alert_type === 'low_mastery' && '❌ Low Mastery'}
                    </h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      alert.severity === 'high'
                        ? 'bg-red-600 text-white'
                        : alert.severity === 'medium'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-blue-600 text-white'
                    }`}>
                      {alert.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="mb-3">{alert.description}</p>
                  {alert.count > 0 && (
                    <p className="text-sm opacity-75 mb-3">
                      Affects {alert.count} student{alert.count !== 1 ? 's' : ''}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded font-semibold transition text-sm">
                      📋 View Details
                    </button>
                    <button className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded font-semibold transition text-sm">
                      ✓ Acknowledge
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
            <Zap className="mx-auto mb-3 text-green-600" size={48} />
            <p className="text-green-700 font-semibold text-lg">✅ All Clear!</p>
            <p className="text-green-600">No alerts for the selected severity level.</p>
          </div>
        )}
      </div>

      {/* Action Items */}
      {alerts?.requiresAction && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6">
          <h4 className="font-bold text-red-700 mb-3 text-lg">🎯 Recommended Actions</h4>
          <ul className="space-y-2 text-red-700">
            {alerts?.alertCounts?.high > 0 && (
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Prioritize {alerts.alertCounts.high} high-severity alert{alerts.alertCounts.high !== 1 ? 's' : ''}</span>
              </li>
            )}
            {alerts?.alertCounts?.medium > 0 && (
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Monitor {alerts.alertCounts.medium} medium-severity alert{alerts.alertCounts.medium !== 1 ? 's' : ''}</span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>Review and acknowledge all alerts within 24 hours</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
