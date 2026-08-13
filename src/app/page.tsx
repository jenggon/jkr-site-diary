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

  // We'll use a hardcoded programmeId for now as per typical Phase 2 initial integration, 
  // or until programme selection is built.
  const programmeId = 'prog-1';

  useEffect(() => {
    async function fetchOpenActivities() {
      try {
        setLoading(true);
        // Assuming session is handled via cookies by Supabase auth helper on the server API route
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
    }
    fetchOpenActivities();
  }, [programmeId]);

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
          
          <Link 
            href="/site-diary"
            className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.2)] hover:shadow-[0_4px_32px_rgba(0,0,0,0.4)] flex items-center gap-2 group"
          >
            <span className="font-medium">Legacy Site Diary</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
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
                className="group relative bg-white/5 border border-white/10 hover:border-blue-500/30 rounded-2xl p-6 backdrop-blur-xl transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(59,130,246,0.2)] cursor-pointer overflow-hidden"
              >
                {/* Subtle gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative z-10">
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
