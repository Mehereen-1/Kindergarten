'use client';

import { useState, useEffect } from 'react';
import { Search, MessageCircle, User as UserIcon } from 'lucide-react';

interface Parent {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface ParentDirectoryProps {
  onSelectParent: (parentId: string, parentName: string) => void;
}

export default function ParentDirectory({ onSelectParent }: ParentDirectoryProps) {
  const [parents, setParents] = useState<Parent[]>([]);
  const [filteredParents, setFilteredParents] = useState<Parent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParents();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = parents.filter(
        (parent) =>
          parent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          parent.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredParents(filtered);
    } else {
      setFilteredParents(parents);
    }
  }, [searchQuery, parents]);

  const fetchParents = async () => {
    try {
      const response = await fetch('/api/teacher/parents');
      if (!response.ok) {
        console.error('Failed to fetch parents:', response.status);
        setLoading(false);
        return;
      }
      const data = await response.json();
      setParents(data.parents || []);
      setFilteredParents(data.parents || []);
    } catch (error) {
      console.error('Error fetching parents:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading parents...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Find Parents</h2>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Parents List */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {filteredParents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No parents found matching your search.
          </div>
        ) : (
          filteredParents.map((parent) => (
            <div
              key={parent.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{parent.name}</h3>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Email:</span> {parent.email}
                    </p>
                    {parent.phone && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Phone:</span> {parent.phone}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onSelectParent(parent.id, parent.name)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <MessageCircle size={16} />
                  Message
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
        Showing {filteredParents.length} of {parents.length} parents
      </div>
    </div>
  );
}
