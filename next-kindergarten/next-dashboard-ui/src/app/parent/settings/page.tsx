'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Bell, Shield, User, LogOut, ArrowRight } from 'lucide-react';
import ParentTopBar from '@/app/components/ParentTopBar';

export default function ParentSettingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'account' | 'security' | 'notifications'>('account');

  useEffect(() => {
    // Get user ID from 'user' cookie
    const cookies = document.cookie.split(';');
    const userCookie = cookies.find(cookie => cookie.trim().startsWith('user='));
    if (userCookie) {
      try {
        const userObj = JSON.parse(decodeURIComponent(userCookie.split('=')[1]));
        if (userObj.id) {
          setUserId(userObj.id);
        }
      } catch (err) {
        console.error('Failed to parse user cookie:', err);
      }
    }
  }, []);

  const handleChangePassword = () => {
    // Get userId from 'user' cookie
    const cookies = document.cookie.split(';');
    const userCookie = cookies.find(cookie => cookie.trim().startsWith('user='));
    let currentUserId = '';
    if (userCookie) {
      try {
        const userObj = JSON.parse(decodeURIComponent(userCookie.split('=')[1]));
        currentUserId = userObj.id || '';
      } catch (err) {
        console.error('Failed to parse user cookie:', err);
      }
    }
    if (currentUserId) {
      router.push(`/change-password?userId=${currentUserId}`);
    } else {
      console.error('User ID not found');
    }
  };

  const handleLogout = () => {
    document.cookie = 'userId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    router.push('/sign-in');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ParentTopBar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account preferences and security</p>
        </div>

        {/* Settings Container */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4 space-y-2 sticky top-20">
              <button
                onClick={() => setActiveTab('account')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition ${
                  activeTab === 'account'
                    ? 'bg-blue-50 text-blue-600 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <User size={20} />
                Account
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition ${
                  activeTab === 'security'
                    ? 'bg-blue-50 text-blue-600 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Shield size={20} />
                Security
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition ${
                  activeTab === 'notifications'
                    ? 'bg-blue-50 text-blue-600 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Bell size={20} />
                Notifications
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Account Settings */}
            {activeTab === 'account' && (
              <div className="bg-white rounded-lg shadow-sm p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h2>

                <div className="space-y-6">
                  {/* User Info Card */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
                    <p className="text-gray-600 mb-4">
                      Your account information is displayed below. Contact support to make changes.
                    </p>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500">User ID</p>
                        <p className="text-gray-900 font-medium">{userId || 'Loading...'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition"
                  >
                    <LogOut size={20} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="bg-white rounded-lg shadow-sm p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Security Settings</h2>

                <div className="space-y-6">
                  {/* Change Password Card */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <Lock size={20} className="text-blue-600" />
                          Password
                        </h3>
                        <p className="text-gray-600 mt-2">
                          Manage your password and keep your account secure
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          handleChangePassword();
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition"
                      >
                        Change Password
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Security Tips */}
                  <div className="border border-blue-200 bg-blue-50 rounded-lg p-6">
                    <h4 className="font-semibold text-blue-900 mb-3">Security Tips</h4>
                    <ul className="space-y-2 text-sm text-blue-800">
                      <li>• Use a strong password with at least 6 characters</li>
                      <li>• Mix uppercase, lowercase, numbers, and symbols</li>
                      <li>• Don't share your password with anyone</li>
                      <li>• Change your password regularly for security</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <div className="bg-white rounded-lg shadow-sm p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Notification Preferences</h2>

                <div className="space-y-6">
                  {/* Email Notifications */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Email Notifications</h3>
                        <p className="text-gray-600 mt-1">Receive updates about your child's activities</p>
                      </div>
                      <div className="relative inline-flex h-8 w-14 items-center rounded-full bg-gray-300 cursor-pointer hover:bg-gray-400 transition" onClick={() => {}}>
                        <div className="inline-flex h-6 w-6 transform rounded-full bg-white transition translate-x-4"></div>
                      </div>
                    </div>
                  </div>

                  {/* Message Notifications */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Message Notifications</h3>
                        <p className="text-gray-600 mt-1">Get notified when teachers send you messages</p>
                      </div>
                      <div className="relative inline-flex h-8 w-14 items-center rounded-full bg-blue-500 cursor-pointer transition" onClick={() => {}}>
                        <div className="inline-flex h-6 w-6 transform rounded-full bg-white transition translate-x-7"></div>
                      </div>
                    </div>
                  </div>

                  {/* Event Notifications */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Event Notifications</h3>
                        <p className="text-gray-600 mt-1">Get alerts about school events and announcements</p>
                      </div>
                      <div className="relative inline-flex h-8 w-14 items-center rounded-full bg-blue-500 cursor-pointer transition" onClick={() => {}}>
                        <div className="inline-flex h-6 w-6 transform rounded-full bg-white transition translate-x-7"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
