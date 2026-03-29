"use client";

import { useState, useEffect } from "react";
import ParentTopBar from "@/app/components/ParentTopBar";
import { User, Mail, Phone, Calendar, Award, Droplet, MapPin } from "lucide-react";

interface Child {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  grade?: string;
  roll?: string;
  address?: string;
  bloodGroup?: string;
  birthday?: string;
  sex?: string;
}

export default function ParentChildPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [parentId, setParentId] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);

  useEffect(() => {
    // Get parent ID from cookie
    const userCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("user="));

    if (userCookie) {
      try {
        const user = JSON.parse(decodeURIComponent(userCookie.split("=")[1]));
        setParentId(user.id);
        fetchChildren(user.id);
      } catch (error) {
        console.error("Error parsing user cookie:", error);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const fetchChildren = async (id: string) => {
    try {
      const response = await fetch(`/api/parent/child?parentId=${id}`);
      const data = await response.json();
      
      if (response.ok) {
        setChildren(data.children || []);
        if (data.children && data.children.length > 0) {
          setSelectedChild(data.children[0]);
        }
      } else {
        console.error("Error fetching children:", data.error);
      }
    } catch (error) {
      console.error("Error fetching children:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <ParentTopBar />
        <main className="flex items-center justify-center h-96 bg-gray-50">
          <div className="text-gray-500">Loading...</div>
        </main>
      </>
    );
  }

  return (
    <>
      <ParentTopBar />
      <main className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Children</h1>
            <p className="text-gray-600">View and manage your children's information</p>
          </div>

          {children.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No children found in your account</p>
              <p className="text-gray-500 text-sm mt-2">
                Please contact the administration to add your children
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Children List Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-md overflow-hidden sticky top-6">
                  <div className="bg-blue-600 text-white p-4">
                    <h2 className="font-bold text-lg">Your Children</h2>
                    <p className="text-sm text-blue-100 mt-1">{children.length} child(ren)</p>
                  </div>
                  
                  <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                    {children.map((child) => (
                      <button
                        key={child._id}
                        onClick={() => setSelectedChild(child)}
                        className={`w-full text-left p-4 rounded-lg transition-all duration-300 ${
                          selectedChild?._id === child._id
                            ? "bg-blue-100 border-l-4 border-blue-600"
                            : "bg-gray-50 hover:bg-gray-100"
                        }`}
                      >
                        <p className="font-semibold text-gray-900">{child.name}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {child.grade || "Grade: N/A"}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Child Details */}
              <div className="lg:col-span-3">
                {selectedChild && (
                  <div className="space-y-6">
                    {/* Header Card */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-8 text-white">
                      <div className="flex items-center gap-6">
                        <div className="w-24 h-24 bg-blue-400 rounded-full flex items-center justify-center text-5xl">
                          👧
                        </div>
                        <div>
                          <h2 className="text-4xl font-bold">{selectedChild.name}</h2>
                          <p className="text-blue-100 mt-2">
                            {selectedChild.grade || "Grade: Not specified"}
                            {selectedChild.roll && ` • Roll: ${selectedChild.roll}`}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Information Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Personal Information */}
                      <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <User className="w-5 h-5 text-blue-600" />
                          Personal Information
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-gray-600">Full Name</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {selectedChild.name}
                            </p>
                          </div>
                          
                          {selectedChild.sex && (
                            <div>
                              <p className="text-sm text-gray-600">Gender</p>
                              <p className="text-lg font-semibold text-gray-900 capitalize">
                                {selectedChild.sex}
                              </p>
                            </div>
                          )}

                          {selectedChild.birthday && (
                            <div>
                              <p className="text-sm text-gray-600">Date of Birth</p>
                              <p className="text-lg font-semibold text-gray-900">
                                {new Date(selectedChild.birthday).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </p>
                            </div>
                          )}

                          {selectedChild.bloodGroup && (
                            <div>
                              <p className="text-sm text-gray-600">Blood Group</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Droplet className="w-5 h-5 text-red-600" />
                                <p className="text-lg font-semibold text-gray-900">
                                  {selectedChild.bloodGroup}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Contact Information */}
                      <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <Mail className="w-5 h-5 text-blue-600" />
                          Contact Information
                        </h3>
                        <div className="space-y-4">
                          {selectedChild.email ? (
                            <div>
                              <p className="text-sm text-gray-600">Email Address</p>
                              <a
                                href={`mailto:${selectedChild.email}`}
                                className="text-lg font-semibold text-blue-600 hover:underline break-all"
                              >
                                {selectedChild.email}
                              </a>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm text-gray-600">Email Address</p>
                              <p className="text-gray-500 italic">Not provided</p>
                            </div>
                          )}

                          {selectedChild.phone ? (
                            <div>
                              <p className="text-sm text-gray-600">Phone Number</p>
                              <a
                                href={`tel:${selectedChild.phone}`}
                                className="text-lg font-semibold text-blue-600 hover:underline flex items-center gap-2"
                              >
                                <Phone className="w-5 h-5" />
                                {selectedChild.phone}
                              </a>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm text-gray-600">Phone Number</p>
                              <p className="text-gray-500 italic">Not provided</p>
                            </div>
                          )}

                          {selectedChild.address && (
                            <div>
                              <p className="text-sm text-gray-600">Address</p>
                              <div className="flex gap-2 mt-1">
                                <MapPin className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                                <p className="text-gray-900">{selectedChild.address}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Academic Information */}
                      <div className="bg-white rounded-lg shadow-md p-6 md:col-span-2">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <Award className="w-5 h-5 text-blue-600" />
                          Academic Information
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {selectedChild.grade && (
                            <div className="bg-blue-50 rounded-lg p-4 text-center">
                              <p className="text-sm text-gray-600">Grade</p>
                              <p className="text-2xl font-bold text-blue-600 mt-2">
                                {selectedChild.grade}
                              </p>
                            </div>
                          )}

                          {selectedChild.roll && (
                            <div className="bg-green-50 rounded-lg p-4 text-center">
                              <p className="text-sm text-gray-600">Roll Number</p>
                              <p className="text-2xl font-bold text-green-600 mt-2">
                                {selectedChild.roll}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                          View Attendance
                        </button>
                        <button className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                          View Results
                        </button>
                        <button className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                          View Class
                        </button>
                        <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                          Message Teacher
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
