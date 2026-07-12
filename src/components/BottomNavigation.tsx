'use client';

import React, { useState } from 'react';

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export default function BottomNavigation() {
  const [activeTab, setActiveTab] = useState('home');

  const tabs: TabItem[] = [
    {
      id: 'home',
      label: 'Utama',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
          />
        </svg>
      ),
    },
    {
      id: 'explore',
      label: 'Teroka',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196 7.5 7.5 0 0010.607 16.197z"
          />
        </svg>
      ),
    },
    {
      id: 'activity',
      label: 'Aktiviti',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a9.04 9.04 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0M3.124 7.5A8.969 8.969 0 015.292 3m13.416 0a8.969 8.969 0 012.168 4.5M21 11.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 6.75 3 8.765 3 11.25c0 2.485 2.099 4.5 4.688 4.5 1.935 0 3.597-1.126 4.312-2.733.715 1.607 2.377 2.733 4.313 2.733 2.59 0 4.687-2.015 4.687-4.5z"
          />
        </svg>
      ),
    },
    {
      id: 'profile',
      label: 'Profil',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center bg-transparent px-4 pb-4">
      <nav className="flex h-16 w-full max-w-md items-center justify-around rounded-2xl border border-zinc-200/50 bg-white/80 px-2 shadow-lg shadow-zinc-200/40 backdrop-blur-lg dark:border-zinc-800/50 dark:bg-zinc-900/80 dark:shadow-zinc-950/50">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 relative ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 scale-105'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {tab.icon}
              <span className="text-[10px] font-medium mt-1">{tab.label}</span>
              {isActive && (
                <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
