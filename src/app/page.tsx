"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface OpenActivity {
  activityId: string;
  programmeId: string;
  revisionId: string;
  taskId: string;
  subtask: string;
  status: string;
  activityDate: string;
}

export default function OpenActivitiesDashboard() {
  const [activities, setActivities] = useState<OpenActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal and creation state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newTaskForm, setNewTaskForm] = useState({
    revisionId: '',
    taskId: '',
    subtask: ''
  });

  // Action states
  const [mutatingId, setMutatingId] = useState<string | null>(null);

  // We'll use a hardcoded programmeId for now as per typical Phase 2 initial integration, 
  // or until programme selection is built.
  const programmeId = 'prog-1';

  const fetchOpenActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/activities/open?programmeId=${programmeId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch open activities');
      }
      const json = await res.json();
      setActivities(json.data || []);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpenActivities();
  }, [programmeId]);

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programme_id: programmeId,
          revision_id: newTaskForm.revisionId,
          task_id: newTaskForm.taskId,
          subtask: newTaskForm.subtask,
        })
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to create activity');
      }
      setShowCreateModal(false);
      setNewTaskForm({ revisionId: '', taskId: '', subtask: '' });
      await fetchOpenActivities();
    } catch (err: any) {
      setCreateError(err.message || 'An error occurred during creation');
    } finally {
      setCreating(false);
    }
  };

  const handleStartActivity = async (activityId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMutatingId(activityId);
    try {
      const res = await fetch(`/api/activities/${activityId}/start`, {
        method: 'POST'
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to start activity');
      }
      await fetchOpenActivities();
    } catch (err: any) {
      alert(err.message || 'Error starting activity');
    } finally {
      setMutatingId(null);
    }
  };

  const handleCompleteActivity = async (activityId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMutatingId(activityId);
    try {
      const res = await fetch(`/api/activities/${activityId}/complete`, {
        method: 'POST'
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to complete activity');
      }
      await fetchOpenActivities();
    } catch (err: any) {
      alert(err.message || 'Error completing activity');
    } finally {
      setMutatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-6 sm:p-12 relative overflow-hidden">
      {/* Decorative Background Elements for Premium Glassmorphism Feel */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full mix-blend-multiply filter blur-[120px] opacity-30 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600 rounded-full mix-blend-multiply filter blur-[120px] opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
      
      <div className="relative z-10 max-w-5xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 tracking-tight">
              Open Activities
            </h1>
            <p className="text-gray-400 mt-2 text-lg">Manage and track your active tasks</p>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all duration-300 shadow-[0_4px_24px_rgba(37,99,235,0.3)] hover:shadow-[0_4px_32px_rgba(37,99,235,0.5)] flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <span>Create Activity</span>
            </button>
            <Link 
              href="/site-diary"
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.2)] hover:shadow-[0_4px_32px_rgba(0,0,0,0.4)] flex items-center gap-2 group"
            >
              <span className="font-medium">Legacy Site Diary</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 backdrop-blur-md">
            <h3 className="text-red-400 font-semibold text-lg flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Error Loading Activities
            </h3>
            <p className="text-red-300/80 mt-2">{error}</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center backdrop-blur-xl shadow-2xl">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-200">No Open Activities</h3>
            <p className="text-gray-400 mt-2 max-w-md mx-auto">You're all caught up! There are no new or in-progress activities for this programme.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities.map(activity => (
              <div 
                key={activity.activityId} 
                className="group relative bg-white/5 border border-white/10 hover:border-blue-500/30 rounded-2xl p-6 backdrop-blur-xl transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(59,130,246,0.2)] flex flex-col justify-between overflow-hidden"
              >
                {/* Subtle gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                
                <div className="relative z-10 mb-6">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full tracking-wide ${
                      activity.status === 'New' 
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {activity.status}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                      {activity.activityDate}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-100 mb-2 leading-tight group-hover:text-blue-400 transition-colors">
                    {activity.subtask || 'Unnamed Subtask'}
                  </h3>
                  
                  <div className="space-y-2 mt-4 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      <span className="truncate" title={activity.taskId}>Task: {activity.taskId}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="relative z-10 mt-auto pt-4 border-t border-white/10 flex justify-end">
                  {activity.status === 'New' && (
                    <button
                      onClick={(e) => handleStartActivity(activity.activityId, e)}
                      disabled={mutatingId === activity.activityId}
                      className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {mutatingId === activity.activityId ? (
                        <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      Start Activity
                    </button>
                  )}
                  {activity.status === 'InProgress' && (
                    <button
                      onClick={(e) => handleCompleteActivity(activity.activityId, e)}
                      disabled={mutatingId === activity.activityId}
                      className="px-4 py-2 bg-green-600/20 hover:bg-green-600/40 border border-green-500/30 text-green-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {mutatingId === activity.activityId ? (
                        <div className="w-4 h-4 border-2 border-green-300 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Activity Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden">
            <h2 className="text-2xl font-bold text-white mb-6">Create Activity</h2>
            
            {createError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateActivity} className="space-y-4 relative z-10">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Programme ID</label>
                <input 
                  type="text" 
                  value={programmeId} 
                  disabled 
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-gray-500 cursor-not-allowed"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Revision UUID</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
                  value={newTaskForm.revisionId}
                  onChange={e => setNewTaskForm({...newTaskForm, revisionId: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Task UUID</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
                  value={newTaskForm.taskId}
                  onChange={e => setNewTaskForm({...newTaskForm, taskId: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Subtask Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Pour Concrete"
                  value={newTaskForm.subtask}
                  onChange={e => setNewTaskForm({...newTaskForm, subtask: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-700 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="px-4 py-2 text-gray-300 hover:text-white bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {creating && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
