'use client';

import { useState, useEffect } from 'react';
import { Edit2, Save, X, AlertCircle } from 'lucide-react';

interface ProfileData {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  bloodGroup?: string;
  birthday?: string;
  sex?: string;
  profilePic?: string;
  role?: string;
  // Student fields
  roll?: string;
  grade?: string;
  classId?: string;
  parentId?: string;
}

interface ProfileViewProps {
  userId?: string;
  targetId?: string;
  childId?: string;
  profileType?: 'user' | 'student';
  theme?: 'default' | 'parent';
  onUpdate?: (profile: ProfileData) => void;
}

export default function ProfileView({
  userId,
  targetId,
  childId,
  profileType = 'user',
  theme = 'default',
  onUpdate
}: ProfileViewProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [editData, setEditData] = useState<ProfileData | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isParentTheme = theme === 'parent';
  const colors = {
    spinnerTrack: isParentTheme ? 'border-[#e3dfc0]' : 'border-blue-200',
    spinnerLead: isParentTheme ? 'border-t-[#5f6843]' : 'border-t-blue-600',
    header: isParentTheme ? 'from-[#5f6843] to-[#6d7750]' : 'from-blue-500 to-blue-600',
    headerText: isParentTheme ? 'text-[#eef3de]' : 'text-blue-100',
    headerBtn: isParentTheme ? 'bg-[#eef3de]/25 hover:bg-[#eef3de]/35' : 'bg-white/20 hover:bg-white/30',
    card: isParentTheme ? 'bg-[#fefcf5] border border-[#d6d2b5]/70 shadow-sm' : 'bg-white shadow',
    label: isParentTheme ? 'text-[#5a6142]' : 'text-gray-700',
    value: isParentTheme ? 'text-[#3a3927]' : 'text-gray-900',
    inputBorder: isParentTheme ? 'border-[#c9c49f]' : 'border-gray-300',
    inputFocus: isParentTheme ? 'focus:ring-[#5f6843]' : 'focus:ring-blue-500',
    divider: isParentTheme ? 'border-[#e2ddbf]' : 'border-gray-200',
    saveBtn: isParentTheme ? 'bg-[#5f6843] hover:bg-[#4f5838] disabled:bg-[#8d9573]' : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400',
    cancelBtn: isParentTheme ? 'bg-[#ede9c8] hover:bg-[#e3dfbd] text-[#3a3927]' : 'bg-gray-200 hover:bg-gray-300 text-gray-900',
  };

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      setError('');

      const params = new URLSearchParams({
        userId: userId || '',
        ...(targetId && { targetId }),
        ...(childId && { childId })
      });

      const response = await fetch(`/api/profile/get?${params}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load profile');
      }

      const data = await response.json();
      setProfile(data.profile);
      setEditData(data.profile);
      setCanEdit(data.canEdit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, targetId, childId]);

  const handleEditChange = (field: string, value: any) => {
    if (editData) {
      setEditData({
        ...editData,
        [field]: value
      });
      // Clear field error when user starts typing
      if (fieldErrors[field]) {
        setFieldErrors({
          ...fieldErrors,
          [field]: ''
        });
      }
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!editData?.name?.trim()) {
      errors.name = 'Name is required';
    }
    if (!editData?.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editData.email)) {
      errors.email = 'Invalid email format';
    }
    if (editData?.phone && !/^\d{10,}$/.test(editData.phone.replace(/\D/g, ''))) {
      errors.phone = 'Phone must be at least 10 digits';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setIsSaving(true);
      setError('');

      const updates = { ...editData };
      delete updates._id;
      delete updates.id;

      const payload = {
        targetId: targetId || userId,
        ...(childId && { childId }),
        profileType,
        updates
      };

      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update profile');
      }

      const data = await response.json();
      setProfile(data.profile);
      setEditData(data.profile);
      setIsEditing(false);
      onUpdate?.(data.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData(profile);
    setIsEditing(false);
    setFieldErrors({});
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin">
          <div className={`w-8 h-8 border-4 ${colors.spinnerTrack} ${colors.spinnerLead} rounded-full`}></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Profile not found</p>
      </div>
    );
  }

  const displayName = profile.name || 'Profile';

  return (
    <div className="max-w-2xl mx-auto">
      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Profile Header */}
      <div className={`bg-gradient-to-r ${colors.header} rounded-lg p-8 mb-6 text-white`}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{displayName}</h1>
            <p className={colors.headerText}>{profile.email}</p>
            {profile.role && (
              <p className={`${colors.headerText} capitalize mt-1`}>
                Role: <strong>{profile.role}</strong>
              </p>
            )}
          </div>
          {canEdit && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`${colors.headerBtn} text-white px-4 py-2 rounded-lg flex items-center gap-2 transition`}
            >
              {isEditing ? (
                <>
                  <X size={18} />
                  Cancel
                </>
              ) : (
                <>
                  <Edit2 size={18} />
                  Edit
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Profile Form */}
      <div className={`${colors.card} rounded-lg p-8 space-y-6`}>
        {/* Basic Information */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Basic Information</h2>
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className={`block text-sm font-medium ${colors.label} mb-2`}>
                Full Name
              </label>
              {isEditing ? (
                <div>
                  <input
                    type="text"
                    value={editData?.name || ''}
                    onChange={(e) => handleEditChange('name', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 ${colors.inputFocus} focus:border-transparent ${
                      fieldErrors.name ? 'border-red-500' : colors.inputBorder
                    }`}
                  />
                  {fieldErrors.name && (
                    <p className="text-red-600 text-sm mt-1">{fieldErrors.name}</p>
                  )}
                </div>
              ) : (
                <p className={`${colors.value} font-medium`}>{profile.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className={`block text-sm font-medium ${colors.label} mb-2`}>
                Email Address
              </label>
              {isEditing ? (
                <div>
                  <input
                    type="email"
                    value={editData?.email || ''}
                    onChange={(e) => handleEditChange('email', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 ${colors.inputFocus} focus:border-transparent ${
                      fieldErrors.email ? 'border-red-500' : colors.inputBorder
                    }`}
                  />
                  {fieldErrors.email && (
                    <p className="text-red-600 text-sm mt-1">{fieldErrors.email}</p>
                  )}
                </div>
              ) : (
                <p className={`${colors.value} font-medium`}>{profile.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className={`block text-sm font-medium ${colors.label} mb-2`}>
                Phone Number
              </label>
              {isEditing ? (
                <div>
                  <input
                    type="tel"
                    value={editData?.phone || ''}
                    onChange={(e) => handleEditChange('phone', e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 ${colors.inputFocus} focus:border-transparent ${
                      fieldErrors.phone ? 'border-red-500' : colors.inputBorder
                    }`}
                  />
                  {fieldErrors.phone && (
                    <p className="text-red-600 text-sm mt-1">{fieldErrors.phone}</p>
                  )}
                </div>
              ) : (
                <p className={`${colors.value} font-medium`}>{profile.phone || '-'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Personal Details */}
        <div className={`border-t ${colors.divider} pt-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Personal Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sex */}
            <div>
              <label className={`block text-sm font-medium ${colors.label} mb-2`}>
                Gender
              </label>
              {isEditing ? (
                <select
                  value={editData?.sex || ''}
                  onChange={(e) => handleEditChange('sex', e.target.value)}
                  className={`w-full px-4 py-2 border ${colors.inputBorder} rounded-lg focus:ring-2 ${colors.inputFocus}`}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              ) : (
                <p className={`${colors.value} font-medium capitalize`}>{profile.sex || '-'}</p>
              )}
            </div>

            {/* Birthday */}
            <div>
              <label className={`block text-sm font-medium ${colors.label} mb-2`}>
                Date of Birth
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={editData?.birthday ? editData.birthday.split('T')[0] : ''}
                  onChange={(e) => handleEditChange('birthday', e.target.value)}
                  className={`w-full px-4 py-2 border ${colors.inputBorder} rounded-lg focus:ring-2 ${colors.inputFocus}`}
                />
              ) : (
                <p className={`${colors.value} font-medium`}>
                  {profile.birthday ? new Date(profile.birthday).toLocaleDateString() : '-'}
                </p>
              )}
            </div>

            {/* Blood Group */}
            <div>
              <label className={`block text-sm font-medium ${colors.label} mb-2`}>
                Blood Group
              </label>
              {isEditing ? (
                <select
                  value={editData?.bloodGroup || ''}
                  onChange={(e) => handleEditChange('bloodGroup', e.target.value)}
                  className={`w-full px-4 py-2 border ${colors.inputBorder} rounded-lg focus:ring-2 ${colors.inputFocus}`}
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              ) : (
                <p className={`${colors.value} font-medium`}>{profile.bloodGroup || '-'}</p>
              )}
            </div>

            {/* Student Grade (read-only) */}
            {profile.grade && (
              <div>
                <label className={`block text-sm font-medium ${colors.label} mb-2`}>
                  Grade
                </label>
                <p className={`${colors.value} font-medium`}>{profile.grade}</p>
              </div>
            )}

            {/* Student Roll (read-only) */}
            {profile.roll && (
              <div>
                <label className={`block text-sm font-medium ${colors.label} mb-2`}>
                  Roll Number
                </label>
                <p className={`${colors.value} font-medium`}>{profile.roll}</p>
              </div>
            )}
          </div>
        </div>

        {/* Address */}
        <div className={`border-t ${colors.divider} pt-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Address</h2>
          <div>
            <label className={`block text-sm font-medium ${colors.label} mb-2`}>
              Full Address
            </label>
            {isEditing ? (
              <textarea
                value={editData?.address || ''}
                onChange={(e) => handleEditChange('address', e.target.value)}
                rows={3}
                className={`w-full px-4 py-2 border ${colors.inputBorder} rounded-lg focus:ring-2 ${colors.inputFocus}`}
                placeholder="Street address, city, state..."
              />
            ) : (
              <p className={`${colors.value} font-medium`}>{profile.address || '-'}</p>
            )}
          </div>
        </div>

        {/* Restricted Fields Warning (for parents) */}
        {isEditing && (profile as any).grade && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">Some fields cannot be edited:</p>
              <p>Grade, Roll Number, and Class assignments can only be changed by school administrators.</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {isEditing && canEdit && (
          <div className={`border-t ${colors.divider} pt-6 flex gap-3`}>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`flex-1 ${colors.saveBtn} text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition`}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  </div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Save Changes
                </>
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className={`flex-1 ${colors.cancelBtn} font-semibold py-3 px-4 rounded-lg transition`}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
