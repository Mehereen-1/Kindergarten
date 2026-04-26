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

  const isStudentProfile = profileType === 'student' || Boolean(childId);
  const isParentTheme = theme === 'parent';

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
    const emailValue = editData?.email?.trim() || '';
    if (!isStudentProfile && !emailValue) {
      errors.email = 'Email is required';
    } else if (emailValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
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
          <div className="w-8 h-8 border-4 border-[color:color-mix(in_srgb,var(--color-outline-variant)_24%,transparent)] border-t-[var(--color-primary)] rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-xl border border-red-300/60 bg-red-50/60 p-4">
        <p className="text-red-700">Profile not found.</p>
      </div>
    );
  }

  const displayName = profile.name || 'Profile';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-300/60 bg-red-50/70 p-4 flex gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Profile Header */}
      <div className="rounded-2xl p-6 md:p-8 mb-6 border border-[color:color-mix(in_srgb,var(--color-outline-variant)_24%,transparent)] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dim)] text-white shadow-[0_16px_36px_rgba(0,0,0,0.22)]">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black mb-2">{displayName}</h1>
            <p className="text-white/85 break-all">{profile.email || 'No email set'}</p>
            {profile.role && (
              <p className="text-white/85 capitalize mt-1">
                Role: <strong>{profile.role}</strong>
              </p>
            )}
            {isStudentProfile && (
              <p className="text-white/85 mt-1">Student Profile</p>
            )}
          </div>
          {canEdit && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="bg-white/18 hover:bg-white/30 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition"
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
      <div className="rounded-2xl border border-[color:color-mix(in_srgb,var(--color-outline-variant)_24%,transparent)] bg-[var(--color-surface-low)] p-6 md:p-8 space-y-6 shadow-[0_12px_34px_rgba(0,0,0,0.14)]">
        <section>
          <h2 className="text-xl font-black text-[var(--color-on-surface)] mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[var(--color-on-surface-variant)] mb-2">
                Full Name
              </label>
              {isEditing ? (
                <div>
                  <input
                    type="text"
                    value={editData?.name || ''}
                    onChange={(e) => handleEditChange('name', e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border bg-[var(--color-surface)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                      fieldErrors.name ? 'border-red-500' : 'border-[color:color-mix(in_srgb,var(--color-outline-variant)_30%,transparent)]'
                    }`}
                  />
                  {fieldErrors.name && <p className="text-red-600 text-sm mt-1">{fieldErrors.name}</p>}
                </div>
              ) : (
                <p className="text-[var(--color-on-surface)] font-semibold">{profile.name || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-on-surface-variant)] mb-2">
                Email Address
              </label>
              {isEditing ? (
                <div>
                  <input
                    type="email"
                    value={editData?.email || ''}
                    onChange={(e) => handleEditChange('email', e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border bg-[var(--color-surface)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                      fieldErrors.email ? 'border-red-500' : 'border-[color:color-mix(in_srgb,var(--color-outline-variant)_30%,transparent)]'
                    }`}
                    placeholder={isStudentProfile ? 'Optional email' : 'example@email.com'}
                  />
                  {fieldErrors.email && <p className="text-red-600 text-sm mt-1">{fieldErrors.email}</p>}
                </div>
              ) : (
                <p className="text-[var(--color-on-surface)] font-semibold break-all">{profile.email || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-on-surface-variant)] mb-2">
                Phone Number
              </label>
              {isEditing ? (
                <div>
                  <input
                    type="tel"
                    value={editData?.phone || ''}
                    onChange={(e) => handleEditChange('phone', e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className={`w-full px-4 py-2.5 rounded-xl border bg-[var(--color-surface)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                      fieldErrors.phone ? 'border-red-500' : 'border-[color:color-mix(in_srgb,var(--color-outline-variant)_30%,transparent)]'
                    }`}
                  />
                  {fieldErrors.phone && <p className="text-red-600 text-sm mt-1">{fieldErrors.phone}</p>}
                </div>
              ) : (
                <p className="text-[var(--color-on-surface)] font-semibold">{profile.phone || '-'}</p>
              )}
            </div>
          </div>
        </section>

        <section className="border-t border-[color:color-mix(in_srgb,var(--color-outline-variant)_24%,transparent)] pt-6">
          <h2 className="text-xl font-black text-[var(--color-on-surface)] mb-4">Personal Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[var(--color-on-surface-variant)] mb-2">
                Gender
              </label>
              {isEditing ? (
                <select
                  value={editData?.sex || ''}
                  onChange={(e) => handleEditChange('sex', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[color:color-mix(in_srgb,var(--color-outline-variant)_30%,transparent)] bg-[var(--color-surface)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              ) : (
                <p className="text-[var(--color-on-surface)] font-semibold capitalize">{profile.sex || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-on-surface-variant)] mb-2">
                Date of Birth
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={editData?.birthday ? editData.birthday.split('T')[0] : ''}
                  onChange={(e) => handleEditChange('birthday', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[color:color-mix(in_srgb,var(--color-outline-variant)_30%,transparent)] bg-[var(--color-surface)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              ) : (
                <p className="text-[var(--color-on-surface)] font-semibold">
                  {profile.birthday ? new Date(profile.birthday).toLocaleDateString() : '-'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-on-surface-variant)] mb-2">
                Blood Group
              </label>
              {isEditing ? (
                <select
                  value={editData?.bloodGroup || ''}
                  onChange={(e) => handleEditChange('bloodGroup', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[color:color-mix(in_srgb,var(--color-outline-variant)_30%,transparent)] bg-[var(--color-surface)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
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
                <p className="text-[var(--color-on-surface)] font-semibold">{profile.bloodGroup || '-'}</p>
              )}
            </div>
          </div>
        </section>

        {isStudentProfile && (
          <section className="border-t border-[color:color-mix(in_srgb,var(--color-outline-variant)_24%,transparent)] pt-6">
            <h2 className="text-xl font-black text-[var(--color-on-surface)] mb-4">Academic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl bg-[var(--color-surface-container)] border border-[color:color-mix(in_srgb,var(--color-outline-variant)_22%,transparent)] p-4">
                <p className="text-xs uppercase tracking-[0.08em] font-bold text-[var(--color-on-surface-variant)]">Grade</p>
                <p className="text-xl font-black text-[var(--color-on-surface)] mt-2">{profile.grade || '-'}</p>
              </div>
              <div className="rounded-xl bg-[var(--color-surface-container)] border border-[color:color-mix(in_srgb,var(--color-outline-variant)_22%,transparent)] p-4">
                <p className="text-xs uppercase tracking-[0.08em] font-bold text-[var(--color-on-surface-variant)]">Roll Number</p>
                <p className="text-xl font-black text-[var(--color-on-surface)] mt-2">{profile.roll || '-'}</p>
              </div>
              <div className="rounded-xl bg-[var(--color-surface-container)] border border-[color:color-mix(in_srgb,var(--color-outline-variant)_22%,transparent)] p-4">
                <p className="text-xs uppercase tracking-[0.08em] font-bold text-[var(--color-on-surface-variant)]">Class</p>
                <p className="text-xl font-black text-[var(--color-on-surface)] mt-2">{profile.classId || '-'}</p>
              </div>
            </div>
          </section>
        )}

        <section className="border-t border-[color:color-mix(in_srgb,var(--color-outline-variant)_24%,transparent)] pt-6">
          <h2 className="text-xl font-black text-[var(--color-on-surface)] mb-4">Address</h2>
          <div>
            <label className="block text-sm font-semibold text-[var(--color-on-surface-variant)] mb-2">
              Full Address
            </label>
            {isEditing ? (
              <textarea
                value={editData?.address || ''}
                onChange={(e) => handleEditChange('address', e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-[color:color-mix(in_srgb,var(--color-outline-variant)_30%,transparent)] bg-[var(--color-surface)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                placeholder="Street address, city, state..."
              />
            ) : (
              <p className="text-[var(--color-on-surface)] font-semibold">{profile.address || '-'}</p>
            )}
          </div>
        </section>

        {/* Restricted Fields Warning (for parents) */}
        {isEditing && isParentTheme && isStudentProfile && (
          <div className="bg-amber-50/90 border border-amber-300/80 rounded-xl p-4 flex gap-3">
            <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">Some fields cannot be edited:</p>
              <p>Grade, Roll Number, and Class assignments can only be changed by school administrators.</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {isEditing && canEdit && (
          <div className="border-t border-[color:color-mix(in_srgb,var(--color-outline-variant)_24%,transparent)] pt-6 flex gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] disabled:opacity-60 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition"
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
              className="flex-1 bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-highest)] text-[var(--color-on-surface)] font-semibold py-3 px-4 rounded-xl transition"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
