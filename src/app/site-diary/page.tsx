/* eslint-disable */
// @ts-nocheck
'use client';

import SearchPicker from "@/components/SearchPicker";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BottomNavigation from '@/components/BottomNavigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRef } from "react";

interface ManpowerEntry {
  trade_name: string;

  bumi_count: number;

  non_bumi_count: number;

  foreign_count: number;
}

interface SiteReport {
  id: string;

  project_id: string;

  weather: string;

  actual_start_date?: string | null;

  ahi: string;

  ahi_name?: string;

  subtask: string;

  subtask_name?: string;

  ahi_display_name?: string;

  work_status: string;

  activity_date: string;

  manpower: ManpowerEntry[];

  notes: string;

  created_at: string;

  submitted_by: string;

  updated_at?: string;
}

// Master System Program (MSP) Activities and default Trades mapping
const TRADE_LIBRARY = [
  "Bar Bender",
  "Bar Cutter",
  "Bricklayer",
  "Carpenter",
  "Concrete Worker",
  "Electrician",
  "Excavator Operator",
  "General Worker",
  "Lorry Driver",
  "Mason",
  "Painter",
  "Plumber",
  "Site Supervisor",
  "Steel Fixer",
  "Welder",
];
export default function Home() {
  function formatDate(
    date: string
  ) {

    return date
      .split("T")[0]
      .split("-")
      .reverse()
      .join("/");

  }

  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();

  // Canonical IDs (A20 Phase 5)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editingRevisionId, setEditingRevisionId] = useState<string | null>(null);
  const [currentRevisionId, setCurrentRevisionId] = useState<string | null>(null);
  const [currentProgrammeId, setCurrentProgrammeId] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<"NEW" | "EDIT">("NEW");

  // Form states
  const [projectSummary, setProjectSummary] =
    useState<any>(null);
  const projectName =
    projectSummary?.task_name ??
    "";
  const [weather, setWeather] = useState('Pagi');
  const [notes, setNotes] = useState('');
  const [workStatus, setWorkStatus] = useState("Mula");
  const [selectedBuildingName, setSelectedBuildingName] = useState("");

  const [selectedWorkPackageName, setSelectedWorkPackageName] = useState("");
  const [activityDate, setActivityDate] = useState(new Date().toISOString().split('T')[0]);
  const [
    actualStartDate,
    setActualStartDate,
  ] = useState("");

  const [editingReportId,
    setEditingReportId] =
    useState("");
  useEffect(() => {
  }, [editingReportId]);

  const [openedAuditId, setOpenedAuditId] =
    useState("");

  const remainingDays =
    projectSummary

      ? Math.ceil(

        (
          new Date(
            projectSummary.finish_date
          ).getTime()

          -

          new Date().setHours(
            0,
            0,
            0,
            0
          )

        ) /

        (
          1000 *
          60 *
          60 *
          24
        )

      )

      : null;

  const projectProgress =
    projectSummary
      ? (() => {

        const start =
          new Date(
            projectSummary.start_date
          ).getTime();

        const finish =
          new Date(
            projectSummary.finish_date
          ).getTime();

        const today =
          new Date();

        today.setHours(
          0,
          0,
          0,
          0
        );

        const elapsed =
          today.getTime() - start;

        const duration =
          finish - start;

        const percent =
          Math.max(
            0,
            Math.min(
              100,
              (elapsed / duration) * 100
            )
          );

        return percent;

      })()

      : 0;

  const dateInputRef =
    useRef<HTMLInputElement>(null);
  const ahiSectionRef =
    useRef<HTMLDivElement>(
      null
    );
  const [formLoading, setFormLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [recallSuccess, setRecallSuccess] = useState(false);
  const [
    showPreviousActivities,
    setShowPreviousActivities
  ] = useState(true);

  useEffect(() => {
  }, [formMode]);

  // MSP Task Picker
  const [activities, setActivities] = useState<
    {
      task_name: string;
      outline_number: string;
      display_name: string;
    }[]
  >([]);

  const [selectedBuilding, setSelectedBuilding] = useState("");
  useEffect(() => {

  }, [selectedBuilding]);

  const [workPackages, setWorkPackages] = useState<
    {
      task_name: string;
      outline_number: string;
      outline_level: number;
    }[]
  >([]);

  const [selectedWorkPackage, setSelectedWorkPackage] = useState("");
  useEffect(() => {

  }, [selectedWorkPackage]);

  // Existing manpower states
  const [customTrades, setCustomTrades] = useState<string[]>([]);
  const [manpower, setManpower] = useState<
    Record<
      string,
      {
        bumi: string;
        nonBumi: string;
        foreign: string;
      }
    >
  >({});

  const [showAddTrade, setShowAddTrade] = useState(false);

  const [tradeSearch, setTradeSearch] =
    useState("");

  const [resourceSuggestions, setResourceSuggestions] =
    useState<string[]>([]);

  const [previousActivities, setPreviousActivities] =
    useState<any[]>([]);

  const [suggestedTrades, setSuggestedTrades] =
    useState<string[]>([]);

  const [tradeLibrary, setTradeLibrary] =
    useState<string[]>([]);

  const [selectedTrades, setSelectedTrades] =
    useState<string[]>([]);

  const [lastRecalledId, setLastRecalledId] =
    useState("");

  // Reports state (mock pre-populated list + live updates)
  const [reports, setReports] = useState<SiteReport[]>([]);

  const [sortMode,
    setSortMode] =
    useState("status");

  const [statusFilter, setStatusFilter] =
    useState<
      "Semua" |
      "Mula" |
      "Sedang Laksana" |
      "Siap"
    >("Semua");

  const [showAllReports,
    setShowAllReports] =
    useState(false);

  useEffect(() => {

  }, [activityDate]);

  const statusPriority: Record<
    string,
    number
  > = {

    "Sedang Laksana": 1,

    "Mula": 2,

    "Siap": 3,

  };

  const sortedReports =
    [...reports].sort(
      (a, b) => {

        if (
          sortMode === "time"
        ) {

          return (
            new Date(
              b.created_at
            ).getTime() -

            new Date(
              a.created_at
            ).getTime()
          );

        }

        return (
          statusPriority[
          a.work_status
          ] -

          statusPriority[
          b.work_status
          ]
        );

      }
    );

  const filteredReports =
    statusFilter === "Semua"
      ? sortedReports
      : sortedReports.filter(
        (report) =>
          report.work_status ===
          statusFilter
      );

  const visibleReports =
    showAllReports
      ? filteredReports
      : filteredReports.slice(
        0,
        10
      );

  const taskHistory =
    reports.filter(
      (x) =>
        x.ahi === selectedBuilding &&
        x.subtask === selectedWorkPackage
    );

  const isFirstRecord =
    taskHistory.length === 0;

  const canStart =

    formMode === "NEW" &&
    isFirstRecord;

  const latestReport =
    taskHistory
      .sort(
        (a, b) =>
          new Date(b.activity_date).getTime() -
          new Date(a.activity_date).getTime()
      )[0];

  const loadReportToForm = async (report: any) => {

    setFormLoading(true);

    try {
      setFormMode("EDIT");
      setEditingReportId(null); // No longer editing a previous SITE DIARY record, just continuing the Activity
      setEditingActivityId(report.activityId || report.id);
      setEditingRevisionId(report.revision_id || report.revisionId);

      setSelectedBuilding(report.ahi || "");
      setSelectedBuildingName(report.ahi_display_name || report.ahi_name || report.ahi || "");

      setSelectedWorkPackage(report.subtask || "");
      setSelectedWorkPackageName(report.subtask_display_name || report.subtask_name || report.subtask || "");

      // Default the weather/notes to empty for the new day
      setWeather(null);
      setNotes("");

      // Start date remains the same as the original activity
      setActualStartDate(report.actual_start_date || "");
      
      setWorkStatus(report.work_status || report.latest_status || report.status || "Sedang Laksana");

      setManpower({});

    } catch (err) {
      console.error("Gagal load data report:", err);
    } finally {
      setFormLoading(false);
    }

  };

  const resetToNewMode = () => {
    setFormMode("NEW");
    setEditingReportId(null);
    setEditingActivityId(null);
    setEditingRevisionId(null);
    setLastRecalledId(null);
    setSelectedBuilding("");

    setSelectedBuildingName("");

    setSelectedWorkPackage("");

    setSelectedWorkPackageName("");

    setSelectedTrades([]);

    setSuggestedTrades([]);

    setResourceSuggestions([]);

    setCustomTrades([]);

    setManpower({});

    setNotes("");

    setWorkStatus("Mula");

    setWeather("Pagi");

    setTradeSearch("");

    setActualStartDate("");

  };

  const isCompleted =
    latestReport?.work_status ===
    "Siap";

  async function loadReports() {

    const response =
      await fetch(
        "/api/reports"
      );

    const data =
      await response.json();

    setReports(data);

    data.forEach((r: any) => {
    });
  }

  async function loadProjectSummary() {

    const response =
      await fetch(
        "/api/project-summary"
      );

    const data =
      await response.json();

    setProjectSummary(data);

  }

  const requiresStartDate =

    formMode === "NEW"

    &&

    (

      workStatus === "Sedang Laksana"

      ||

      workStatus === "Siap"

    );

  // Arahkan ke halaman log masuk sekiranya tiada sesi aktif

  useEffect(() => {

    if (
      !canStart &&
      workStatus === "Mula"
    ) {

      setWorkStatus(
        "Sedang Laksana"
      );

    }

  }, [
    canStart,
    workStatus,
  ]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function loadBuildings() {
      const response = await fetch("/api/ahi");

      const data = await response.json();

      setActivities(data);
    }

    loadBuildings();
  }, []);

  useEffect(() => {
    async function checkSupabase() {
      try {
        const { error } = await supabase.from('site_diary').select('*').limit(1);

        if (error && error.code !== 'PGRST116' && error.message.includes('FetchError')) {
          setSupabaseConnected(false);
          setErrorMessage(error.message);
        } else {
          setSupabaseConnected(true);
        }
      } catch (err) {
        setSupabaseConnected(false);
        const errMessage = err instanceof Error ? err.message : 'Ralat sambungan';
        setErrorMessage(errMessage);
      }
    }
    checkSupabase();
  }, []);

  useEffect(() => {
    async function loadTradeLibrary() {
      const { data, error } =
        await supabase
          .from("trade_library")
          .select("trade_name")
          .order("trade_name");

      if (!error && data) {
        setTradeLibrary(
          data.map(
            (item) => item.trade_name
          )
        );
      }
    }
    loadTradeLibrary();
  }, []);

  async function loadPrevious() {
    if (!activityDate) return;

    // A20 Phase 5: Fetch Canonical Open Activities instead of legacy site_diary
    const response = await fetch(
      `/api/activities/open?programmeId=0651e125-3ef4-47c4-a3fa-8aec49bdf979`
    );

    const json = await response.json();
    if (json.data && json.data.length > 0) {
      // Store the current revision and programme IDs from the first active task for reference
      setCurrentRevisionId(json.data[0].revisionId);
      setCurrentProgrammeId(json.data[0].programmeId);
    }

    const latestMap = new Map();

    for (const item of (json.data || [])) {
      const key = item.activityId;
      latestMap.set(key, {
        ...item,
        id: item.activityId,
        ahi: item.ahi,
        ahi_display_name: item.ahiDisplayName,
        subtask: item.subtask,
        subtask_name: item.subtaskDisplayName,
        activity_date: item.createdAt, // Just for UI sorting
        work_status: item.status === 'In Progress' ? 'Sedang Laksana' : item.status,
        latest_status: item.status === 'In Progress' ? 'Sedang Laksana' : item.status,
        latest_date: item.updatedAt || item.createdAt,
        active_since: item.createdAt
      });
    }

    setPreviousActivities(
      [...latestMap.values()].filter(x => x.work_status !== "Siap" && x.work_status !== "Completed")
    );
  }

  useEffect(() => {
    loadPrevious();
  }, [activityDate]);

  useEffect(() => {

    loadReports();

    loadProjectSummary();

  }, []);

  useEffect(() => {

  }, [projectSummary]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const loadResources = async (outline: string) => {
    try {
      const params = new URLSearchParams();
      params.append('taskId', outline); // outline maps to mspTaskId
      params.append('activityName', projectName);
      if (currentProgrammeId) params.append('programmeId', currentProgrammeId);
      if (currentRevisionId) params.append('revisionId', currentRevisionId);

      const response = await fetch(`/api/intelligence?${params.toString()}`);
      if (!response.ok) {
         console.warn('Intelligence API returned error:', await response.text());
         return;
      }
      
      const data = await response.json();
      const tradeRes = data.tradeResolution;

      if (tradeRes) {
        if (tradeRes.resolutionSource === 'MSP_RESOURCE') {
           setResourceSuggestions([tradeRes.tradeName]);
           setSuggestedTrades([tradeRes.tradeName]);
        } else if (tradeRes.resolutionSource === 'KNOWLEDGE_ENGINE') {
           // Set array of top 3
           const top3 = [tradeRes.tradeName, ...(tradeRes.alternatives || [])];
           setSuggestedTrades(top3);
        } else {
           setSuggestedTrades([tradeRes.tradeName]);
        }
        setSelectedTrades([]);
      }

    } catch (err) {
      console.error('Failed to load intelligence resources', err);
    }
  };

  const handleBuildingChange = async (building: string) => {

    setSelectedBuilding(building);

    const activity = activities.find(
      x => x.outline_number === building
    );

    setSelectedBuildingName(
      activity?.display_name ||
      activity?.task_name ||
      building
    );

    setSelectedWorkPackage("");

    const response = await fetch(
      `/api/workpackages?building=${building}`
    );

    const data = await response.json();

    setWorkPackages(data);

    return data;
  };

  const clearAHISelection = () => {

    resetToNewMode();

  };

  async function checkDuplicateToday(
    building: string,
    subtask: string
  ) {

    const duplicateReport =
      reports.find(
        (x) =>
          x.activity_date === activityDate &&
          x.ahi === building &&
          x.subtask === subtask
      );

    if (!duplicateReport) return;

    alert(
      "Rekod untuk subtask ini telah wujud hari ini.\n\n" +
      "Laporan sedia ada akan dibuka untuk kemaskini."
    );

    await loadReportToForm(
      duplicateReport
    );

    const restoredManpower =
      duplicateReport.manpower.reduce(
        (
          acc: any,
          curr: any
        ) => {

          acc[curr.trade_name] = {

            bumi:
              String(
                curr.bumi_count || 0
              ),

            nonBumi:
              String(
                curr.non_bumi_count || 0
              ),

            foreign:
              String(
                curr.foreign_count || 0
              ),

          };

          return acc;

        },
        {}
      );

    setManpower(
      restoredManpower
    );

  }

  const handleManpowerChange = (
    trade: string,
    field: 'bumi' | 'nonBumi' | 'foreign',
    value: string
  ) => {
    setManpower(prev => ({
      ...prev,
      [trade]: {
        ...prev[trade],
        [field]: value
      }
    }));
  };
  const allTrades = [
    ...new Set([
      ...TRADE_LIBRARY,
      ...tradeLibrary,
    ]),
  ];

  const filteredTradeLibrary =
    allTrades.filter((trade) =>
      trade
        .toLowerCase()
        .includes(
          tradeSearch.toLowerCase()
        )
    );
  const getCurrentTrades = () => {
    return [
      ...new Set([
        ...selectedTrades,
        ...customTrades,
      ]),
    ];
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setSubmitSuccess(false);

    if (!projectName || !notes) {
      alert('Sila lengkapkan semua medan laporan.');
      setFormLoading(false);
      return;
    }

    // Tapis dan kumpulkan rekod tenaga kerja yang diisi
    const compiledManpower: ManpowerEntry[] = [];
    getCurrentTrades().forEach(trade => {
      const bumi = parseInt(manpower[trade]?.bumi || '0') || 0;
      const nonBumi = parseInt(manpower[trade]?.nonBumi || '0') || 0;
      const foreign = parseInt(manpower[trade]?.foreign || '0') || 0;
      if (bumi > 0 || nonBumi > 0 || foreign > 0) {
        compiledManpower.push({
          trade_name: trade,

          bumi_count: bumi,

          non_bumi_count: nonBumi,

          foreign_count: foreign
        });
      }
    });

    if (compiledManpower.length === 0) {
      alert('Sila masukkan sekurang-kurangnya satu (1) bilangan tenaga kerja.');
      setFormLoading(false);
      return;
    }

    const duplicateReport =
      taskHistory.find(
        (x) =>
          x.ahi ===
          selectedBuilding &&
          x.subtask ===
          selectedWorkPackage
      );

    if (
      isCompleted &&
      formMode === "NEW"
    ) {
      alert(
        `Aktiviti ini telah disiapkan pada ${new Date(latestReport!.activity_date).toLocaleDateString("en-GB")
        }.

    Rekod tersebut akan dibuka untuk kemaskini.`
      );

      await loadReportToForm(latestReport);

      ahiSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      setFormLoading(false);

      return;
    }

    if (
      duplicateReport &&
      formMode === "NEW"
    ) {
      alert(
        "Laporan sedia ada akan dibuka untuk kemaskini."
      );

      await loadReportToForm(duplicateReport);

      ahiSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      setFormLoading(false);

      return;
    }

    if (

      requiresStartDate &&

      !actualStartDate

    ) {
      alert(
        "Sila masukkan Tarikh Mula Aktiviti Sebenar."
      );

      return;

    }

    try {

      let finalActivityId = editingActivityId;
      let finalRevisionId = editingRevisionId || currentRevisionId;
      const finalProgrammeId = currentProgrammeId || '0651e125-3ef4-47c4-a3fa-8aec49bdf979';

      // 1. If we are in NEW mode and selected a task from SearchPicker, we MUST create the Open Activity first
      if (!finalActivityId && selectedTaskId) {
        const actRes = await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            programmeId: finalProgrammeId,
            revisionId: finalRevisionId,
            taskId: selectedTaskId,
            activityName: selectedWorkPackageName || "New Activity"
          })
        });

        if (!actRes.ok) {
          const actErr = await actRes.json();
          // If it already exists, the backend validation might fail, we should handle it gracefully in production, but for now we surface the error.
          throw new Error(actErr.error || "Gagal membuka aktiviti baru");
        }

        const actJson = await actRes.json();
        finalActivityId = actJson.data.activityId;
        finalRevisionId = actJson.data.revisionId || finalRevisionId;
      }

      if (!finalActivityId) {
        throw new Error("Sila pilih aktiviti / work package");
      }

      // 2. Submit Site Diary
      const payload = {
        programme_id: finalProgrammeId,
        revision_id: finalRevisionId,
        activity_id: finalActivityId,
        activity_date: activityDate,
        notes,
        weather,
        manpower: compiledManpower
      };

      const res = await fetch('/api/site-diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Gagal menghantar laporan site diary");
      }

      // 3. Update Activity Status/State if necessary
      // NOTE: According to A20 Phase 5 architecture, frontend should use specific endpoints to change Activity Status.
      // For now, we use the PATCH /api/activities/[id] to just update the Activity (we leave status state handling to future phases or if they use the correct API).
      if (workStatus !== "Sedang Laksana") {
        // e.g. if they mark it Siap (Completed), we would call POST /api/activities/[id]/complete
        if (workStatus === "Siap") {
           await fetch(`/api/activities/${finalActivityId}/complete`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ completedBy: user?.email || 'system' })
           });
        } else if (workStatus === "Tangguh") {
           await fetch(`/api/activities/${finalActivityId}/suspend`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ reason: notes, suspendedBy: user?.email || 'system' })
           });
        } else if (workStatus === "Batal") {
           await fetch(`/api/activities/${finalActivityId}/cancel`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ reason: notes, cancelledBy: user?.email || 'system' })
           });
        }
      } else {
        // Just started or in progress
        await fetch(`/api/activities/${finalActivityId}/start`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ startedBy: user?.email || 'system' })
        });
      }

      await loadReports();
      await loadPrevious();
      resetToNewMode();
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);

    } catch (err: any) {
      console.error("Ralat ketika menghantar laporan:", err);
      alert(err.message || "Ralat tidak diketahui");
    } finally {
      setFormLoading(false);
    }
  };

  // Dapatkan parap emel (initials) untuk avatar
  const getUserInitials = () => {
    if (!user || !user.email) return 'JD';
    return user.email.substring(0, 2).toUpperCase();
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen w-full bg-zinc-950 text-white flex justify-center items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-t-indigo-500 border-zinc-800 animate-spin"></div>
          <span className="text-sm text-zinc-400 font-medium">Memuatkan halaman...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-white flex justify-center items-center p-0 md:p-6">
      {/* Container Mudah Alih (Mobile Container Frame) */}
      <div className="w-full max-w-md min-h-screen md:min-h-[850px] md:h-[850px] md:rounded-[40px] md:border-8 md:border-zinc-800 bg-zinc-900 shadow-2xl relative flex flex-col overflow-y-auto pb-24 md:pb-20 scrollbar-none">

        {/* Hiasan Kamera Telefon (Notch) - Hanya ditunjukkan pada desktop */}
        <div className="hidden md:block absolute top-2 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-800 rounded-full z-50"></div>

        {/* Pengepala Utama (App Header) */}
        <header className="sticky top-0 z-40 bg-zinc-900/90 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-zinc-800/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-sm tracking-wider shadow-lg shadow-indigo-600/30">
              🏗️
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide leading-none">JKR Site Diary</h1>
              <span className="text-[9px] text-zinc-400 font-medium mt-0.5 block">Log Tapak Bina Digital</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors relative">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5 text-zinc-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a9.04 9.04 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0M3.124 7.5A8.969 8.969 0 015.292 3m13.416 0a8.969 8.969 0 012.168 4.5" />
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-zinc-800 animate-pulse"></span>
            </button>
            <div
              onClick={handleSignOut}
              title="Klik untuk Log Keluar"
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[1.5px] cursor-pointer hover:scale-105 active:scale-95 transition-all group relative"
            >
              <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center text-xs font-semibold group-hover:bg-zinc-800 transition-colors">
                {getUserInitials()}
              </div>
              <span className="absolute right-0 top-10 scale-0 group-hover:scale-100 transition-all bg-rose-600 text-white text-[9px] font-semibold py-1 px-2 rounded shadow-md whitespace-nowrap z-50">
                Log Keluar
              </span>
            </div>
          </div>
        </header>

        {/* Kandungan Halaman (Page Content) */}
        <main className="p-6 flex flex-col gap-6 flex-grow">

          {/* Papan Selamat Datang Pengguna & Status Supabase */}
          <div className="px-1 flex flex-col gap-3 bg-zinc-850/30 border border-zinc-800/40 rounded-2xl p-4">
            <div className="flex justify-between items-center">
              <div className="truncate max-w-[200px]">
                <span className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">Pengurus Log Tapak:</span>
                <h2 className="text-sm font-semibold text-white truncate mt-0.5" title={user.email}>
                  {user.email}
                </h2>
              </div>
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 text-xs font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl hover:bg-rose-500/20 transition-all active:scale-95"
              >
                Log Keluar
              </button>
            </div>

            <div className="flex items-center justify-between pt-2.5 border-t border-zinc-800/50">
              <span className="text-[10px] text-zinc-400 font-medium">Sambungan Supabase:</span>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-900 border border-zinc-800">
                {supabaseConnected === null ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-ping"></span>
                    <span className="text-yellow-500">Menyemak</span>
                  </>
                ) : supabaseConnected ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-emerald-400">Aktif</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    <span className="text-rose-400">Dilaraskan</span>
                  </>
                )}
              </div>
            </div>
            {supabaseConnected === false && errorMessage && (
              <div className="text-[9px] text-rose-400 bg-rose-500/5 border border-rose-500/10 rounded-lg p-2 mt-1">
                ⚠️ {errorMessage}
              </div>
            )}

          </div>

          {/* Borang Input Site Diary */}
          <div className="w-full rounded-3xl bg-zinc-800/20 border border-zinc-800/60 p-5 shadow-xl backdrop-blur-md">
            <h2 className="text-base font-bold text-zinc-150 mb-4 flex items-center gap-2">
              📝 Hantar Laporan Harian
            </h2>

            {submitSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                <span>✅</span> Laporan berjaya dihantar dan direkodkan!
              </div>
            )}

            {recallSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                <span>🔄</span> Aktiviti berjaya dimuatkan!
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">

              {formMode === "EDIT" && (

                <div
                  className="
                    mb-4

                    p-3

                    rounded-xl

                    border
                    border-amber-500/30

                    bg-amber-500/10

                    text-amber-300

                    text-xs

                    font-semibold

                    animate-pulse
                  "
                >

                  ✏️ Anda sedang mengemaskini laporan sedia ada.

                </div>

              )}

              <div className="mb-6">

                <div
                  className="
                    text-[11px]
                    uppercase
                    tracking-[0.30em]
                    text-zinc-500
                    font-bold
                    mb-3
                  "
                >
                  PROJEK
                </div>

                <div
                  className="
                    relative

                    overflow-hidden

                    rounded-2xl

                    border
                    border-zinc-800

                    bg-gradient-to-br
                    from-zinc-900
                    via-zinc-900
                    to-zinc-950

                    p-6

                    shadow-lg
                    shadow-black/30
                  "
                >

                  {/* Accent Bar */}

                  <div
                    className="
                      absolute
                      left-0
                      top-0

                      h-full
                      w-1.5

                      bg-indigo-500
                    "
                  />

                  {/* Project Title */}

                  <div
                    className="
                      pl-4

                      text-xl

                      font-black

                      leading-8

                      tracking-tight

                      text-white

                      break-words
                    "
                  >
                    {projectName || "Loading..."}
                  </div>

                  {/* Footer */}

                  <div
                    className="
                      mt-6

                      border-t
                      border-zinc-800

                      pt-4
                    "
                  >

                    <div
                      className="
                        flex

                        justify-between

                        text-[10px]

                        uppercase

                        tracking-[0.2em]

                        text-zinc-500
                      "
                    >

                      <span>Mula</span>

                      <span>Siap</span>

                    </div>

                    <div
                      className="
                          mt-3

                          relative

                          h-1.5

                          overflow-hidden

                          rounded-full

                          bg-zinc-800/70
                        "
                    >

                      <div
                        className="
                            absolute

                            left-0
                            top-0

                            h-1.5

                            rounded-full

                            bg-gradient-to-r

                            from-indigo-400

                            via-violet-500

                            to-fuchsia-500

                            shadow-[0_0_12px_rgba(99,102,241,0.45)]
                          "

                        style={{

                          width:
                            `${projectProgress}%`

                        }}

                      />

                      <div
                        className="
                            absolute

                            top-1/2

                            -translate-y-1/2

                            w-3
                            h-3

                            rounded-full

                            bg-white

                            ring-4

                            ring-indigo-500/40

                            shadow-[0_0_10px_rgba(99,102,241,0.60)]
                          "

                        style={{

                          left:
                            `calc(${projectProgress}% - 6px)`

                        }}

                      />

                    </div>

                    <div
                      className="
                          mt-4

                          flex

                          justify-between

                          text-sm

                          font-bold

                          tracking-wide

                          text-zinc-200
                        "
                    >

                      <span>

                        {projectSummary

                          ? formatDate(
                            projectSummary.start_date
                          )

                          : "--"}

                      </span>

                      <span>

                        {projectSummary

                          ? formatDate(
                            projectSummary.finish_date
                          )

                          : "--"}

                      </span>

                    </div>

                  </div>

                </div>

              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Tarikh Aktiviti
                </label>

                <div className="flex gap-2">

                  <div className="relative flex-1">

                    <input
                      ref={dateInputRef}
                      type="date"
                      value={activityDate}
                      onChange={(e) =>
                        setActivityDate(e.target.value)
                      }
                      max={activityDate}
                      onKeyDown={(e) =>
                        e.preventDefault()
                      }
                      className="w-full h-12 px-4 rounded-xl bg-zinc-950 border border-zinc-800"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        dateInputRef.current?.showPicker();
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      📅
                    </button>

                  </div>

                  <div className="h-12 px-4 rounded-xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-xs font-semibold text-indigo-300 whitespace-nowrap">
                    🎯 D-{remainingDays}
                  </div>

                </div>

              </div>

              {previousActivities.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">

                    <h3 className="text-sm font-semibold">
                      Aktiviti Terdahulu ({previousActivities.length})
                    </h3>

                    <button
                      type="button"
                      onClick={() =>
                        setShowPreviousActivities(
                          !showPreviousActivities
                        )
                      }
                      className="
                        w-7
                        h-7
                        rounded-lg
                        flex
                        items-center
                        justify-center
                        text-zinc-400
                        hover:text-white
                        hover:bg-zinc-800
                        transition-all
                      "
                    >
                      {showPreviousActivities
                        ? "▼"
                        : "▶"}
                    </button>

                  </div>

                  {showPreviousActivities &&
                    previousActivities.map((item) => (
                      <div
                        key={item.id}
                        className={`

                        mb-3

                        p-4

                        rounded-2xl

                        bg-zinc-900/40

                        border
                        border-zinc-800/50

                        border-l-4

                        ${item.work_status ===
                            "Sedang Laksana"

                            ? "border-l-amber-500"

                            : item.work_status ===
                              "Siap"

                              ? "border-l-sky-500"

                              : "border-l-emerald-500"

                          }

                      `}
                      >

                        {/* Header */}

                        <h4
                          className="
                          text-lg
                          font-bold

                          leading-tight

                          break-words

                          line-clamp-2
                        "
                        >

                          {item.subtask_name || item.subtask}

                        </h4>

                        {/* Context */}

                        <div
                          className="
                          mt-2

                          flex
                          items-start
                          gap-1.5

                          text-[12px]

                          break-words
                        "
                        >

                          <span
                            className="
                            text-zinc-500
                            font-bold
                            shrink-0
                          "
                          >
                            @
                          </span>

                          <span
                            className="
                            text-indigo-300
                            font-medium

                            line-clamp-2
                          "
                          >

                            {item.ahi_display_name ||
                              item.ahi_name ||
                              item.ahi}

                          </span>

                        </div>

                        {/* Footer */}

                        <div
                          className="
                          mt-4

                          flex

                          items-end

                          justify-between
                        "
                        >

                          <div>

                            <div
                              className="
                              text-[11px]
                              text-zinc-500
                            "
                            >

                              {(() => {

                                const today =
                                  new Date(activityDate);

                                const finish =
                                  new Date(
                                    item.planned_finish
                                  );

                                const diffDays =
                                  Math.ceil(
                                    (
                                      finish.getTime() -
                                      today.getTime()
                                    ) /
                                    (
                                      1000 *
                                      60 *
                                      60 *
                                      24
                                    )
                                  );

                                const tDayLabel =

                                  diffDays > 0

                                    ? `T-${diffDays}`

                                    : diffDays === 0

                                      ? "T-0"

                                      : `T+${Math.abs(diffDays)}`;

                                return (
                                  <>

                                    Aktif sejak

                                    {" • "}

                                    {
                                      new Date(
                                        item.active_since
                                      ).toLocaleDateString(
                                        "en-GB"
                                      )
                                    }

                                    {" "}

                                    <span
                                      className={`
                                      inline-flex
                                      items-center

                                      px-1.5
                                      py-0.5

                                      rounded-md

                                      text-[10px]
                                      font-bold

                                      ${diffDays > 30

                                          ? "bg-zinc-800 text-zinc-300"

                                          : diffDays >= 15

                                            ? "bg-amber-500/15 text-amber-400"

                                            : diffDays >= 1

                                              ? "bg-orange-500/15 text-orange-400"

                                              : diffDays === 0

                                                ? "bg-red-500/15 text-red-400"

                                                : "bg-red-500/15 text-red-400"
                                        }
                                    `}
                                    >

                                      [{tDayLabel}]

                                    </span>

                                  </>
                                );

                              })()}

                            </div>

                            <div
                              className={`
                              mt-1

                              inline-flex

                              items-center

                              gap-1.5

                              px-2.5

                              py-0.5

                              rounded-full

                              text-[10px]

                              font-bold

                              border

                              ${item.work_status ===
                                  "Sedang Laksana"

                                  ? "text-amber-400 border-amber-500/30 bg-amber-500/10"

                                  : item.work_status ===
                                    "Siap"

                                    ? "text-sky-400 border-sky-500/30 bg-sky-500/10"

                                    : "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"

                                }
                            `}
                            >

                              ●

                              {item.work_status}

                            </div>

                          </div>

                          {item.work_status !== "Siap" && (
                            <button
                              type="button"
                              onClick={async () => {

                                setLastRecalledId(item.id);

                                await loadReportToForm(item);

                                ahiSectionRef.current?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "start",
                                });

                                setRecallSuccess(true);

                                setTimeout(() => {
                                  setRecallSuccess(false);
                                }, 2000);

                              }}

                              className={`text-xs px-3 py-1 rounded-lg text-white ${lastRecalledId === item.id
                                ? "bg-emerald-600"
                                : "bg-indigo-600 hover:bg-indigo-500"
                                }`}
                            >
                              {lastRecalledId === item.id
                                ? "✓ Disambung"
                                : "Sambung"}
                            </button>
                          )}

                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Pilihan Cuaca (Segmented Radio) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-400">Cuaca Hari Ini</label>
                <div className="flex p-1 bg-zinc-950 rounded-xl border border-zinc-850">
                  {['Pagi', 'Petang', 'Malam'].map((w) => {
                    const icons: Record<string, string> = { Pagi: '☀️ Pagi', Petang: '🌧️ Petang', Malam: '🌙 Malam' };
                    const isActive = weather === w;
                    return (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setWeather(w)}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${isActive ? 'bg-zinc-850 text-white shadow-sm ring-1 ring-zinc-800' : 'text-zinc-500 hover:text-zinc-350'
                          }`}
                        disabled={formLoading}
                      >
                        {icons[w]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div ref={ahiSectionRef}>
                <div className="flex items-center justify-between mb-2">

                  <label className="block text-sm font-medium">
                    AHI - Aktiviti Hari Ini?
                  </label>

                  {true && (
                    <button
                      type="button"
                      onClick={clearAHISelection}
                      className="
                      text-xs
                      font-medium
                      text-zinc-500
                      hover:text-indigo-400
                      transition-colors
                      "
                    >
                      ⟲ Reset
                    </button>
                  )}

                </div>

                <div className="relative">

                  <SearchPicker
                    label=""
                    placeholder="Cari aktiviti..."
                    items={activities}
                    value={selectedBuilding}
                    displayValue={selectedBuildingName}
                    onSelect={(value, item) => {

                      if (formMode === "EDIT") {

                        resetToNewMode();

                      }

                      setSelectedBuildingName(
                        item.display_name ||
                        item.task_name
                      );

                      setSelectedWorkPackage("");
                      setSelectedWorkPackageName("");

                      setSuggestedTrades([]);
                      setSelectedTrades([]);
                      setResourceSuggestions([]);

                      setCustomTrades([]);
                      setManpower({});

                      handleBuildingChange(value);

                    }}
                  />
                </div>

              </div>

              {selectedBuilding && (
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">
                    Subtask
                  </label>

                  <SearchPicker
                    label=""
                    placeholder="Cari subtask..."
                    items={workPackages}
                    value={selectedWorkPackage}
                    displayValue={selectedWorkPackageName}
                    onSelect={async (value, item) => {

                      setSelectedWorkPackage(value);

                      setSelectedWorkPackageName(
                        item.display_name ||
                        item.task_name
                      );

                      await loadResources(value);

                      await checkDuplicateToday(
                        selectedBuilding,
                        value
                      );

                    }}
                  />
                </div>
              )}

              {/* Resource MSP Debug */}
              {/*
              {resourceSuggestions.length > 0 && (
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">
                    Resource MSP
                  </label>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    {resourceSuggestions.map((resource) => (
                      <div
                        key={resource}
                        className="text-sm text-zinc-200 py-1"
                      >
                        {resource}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              */}

              {/* Resource MSP Debug */}
              {suggestedTrades.length > 0 && (
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">
                    Cadangan Tred
                  </label>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    {suggestedTrades.map((trade) => {
                      const isSelected =
                        selectedTrades.includes(trade);

                      return (
                        <button
                          key={trade}
                          type="button"
                          onClick={() => {

                            if (isSelected) {

                              //----------------------------------
                              // UNTICK
                              //----------------------------------

                              setSelectedTrades(prev =>
                                prev.filter(
                                  x => x !== trade
                                )
                              );

                              setManpower(prev => {

                                const copy = { ...prev };

                                delete copy[trade];

                                return copy;

                              });

                            } else {

                              //----------------------------------
                              // TICK
                              //----------------------------------

                              setSelectedTrades(prev => [

                                ...prev,

                                trade,

                              ]);

                            }

                          }}
                          className={`flex items-center justify-between w-full px-3 py-2 rounded-lg border text-sm ${isSelected
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                            : "border-zinc-800 bg-zinc-950 text-zinc-300"
                            }`}
                        >
                          <span>{trade}</span>

                          <span className="font-bold">

                            {isSelected ? "☑" : "☐"}

                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddTrade(!showAddTrade);
                      setTradeSearch('');
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    {showAddTrade ? 'Batal' : '+ Tambah Tred (Manual)'}
                  </button>

                </div>
              )}

              <div className="mt-4 flex flex-col gap-4">

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Status Kerja
                  </label>

                  <div className="grid grid-cols-3 gap-2">
                    {(["Mula", "Sedang Laksana", "Siap"] as const).map((status) => {

                      const isEditing =
                        formMode !== "NEW";

                      const disabled =
                        status === "Mula" &&
                        formMode !== "NEW" ||

                        (isEditing && status === "Mula") ||

                        (
                          isEditing &&
                          latestReport?.work_status === "Siap" &&
                          status !== "Siap"
                        );

                      return (

                        <button
                          key={status}
                          type="button"

                          disabled={disabled}

                          onClick={() => {

                            if (disabled) return;

                            setWorkStatus(status);

                          }}

                          className={`
                            rounded-xl
                            border
                            p-2
                            text-xs
                            font-semibold
                            transition-all

                            ${disabled ? "opacity-30 cursor-not-allowed" : ""}

                            ${status === "Mula"
                              ? workStatus === status
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "bg-emerald-950/30 border-emerald-500/20 text-emerald-400"

                              : status === "Sedang Laksana"

                                ? workStatus === status
                                  ? "bg-amber-500 border-amber-500 text-black"
                                  : "bg-amber-950/30 border-amber-500/20 text-amber-400"

                                : workStatus === status
                                  ? "bg-sky-500 border-sky-500 text-white"
                                  : "bg-sky-950/30 border-sky-500/20 text-sky-400"
                            }
                          `}
                        >
                          {status}
                        </button>

                      );

                    })}
                  </div>
                </div>

              </div>

              {
                formMode === "NEW" &&
                requiresStartDate &&
                (

                  <div className="mt-4">

                    <label className="block text-sm font-medium mb-2">

                      Tarikh Mula Aktiviti Sebenar

                    </label>

                    <input
                      type="date"
                      value={actualStartDate}
                      max={activityDate}
                      onChange={(e) =>
                        setActualStartDate(
                          e.target.value
                        )
                      }
                      className="
                        w-full

                        rounded-xl

                        border
                        border-zinc-800

                        bg-zinc-900

                        px-3
                        py-2
                      "
                    />

                    <p className="mt-1 text-[10px] text-zinc-500">

                      Aktiviti ini dipercayai telah bermula sebelum direkodkan dalam Site Diary.

                    </p>

                  </div>

                )}

              {/* Komponen Kemasukan Tenaga Kerja Terperinci */}
              <div className="flex flex-col gap-3 bg-zinc-950/40 p-4 rounded-2xl border border-zinc-850">
                <div className="pb-2 border-b border-zinc-800/40">

                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-350">
                      Tenaga Kerja & Tred
                    </span>

                  </div>

                  <div className="mt-2 text-[10px] text-zinc-500 space-y-1">
                    <div>
                      <span className="font-semibold text-zinc-300">W.B</span>
                      {" = Warganegara | Bumiputera"}
                    </div>

                    <div>
                      <span className="font-semibold text-zinc-300">W.NB</span>
                      {" = Warganegara | Bukan Bumiputera"}
                    </div>

                    <div>
                      <span className="font-semibold text-zinc-300">B.W</span>
                      {" = Bukan Warganegara"}
                    </div>
                  </div>

                </div>

                {/* Input Tred Kustom Dinamik */}
                {showAddTrade && (
                  <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800 animate-slide-down">

                    <input
                      type="text"
                      placeholder="Cari tred..."
                      value={tradeSearch}
                      onChange={(e) =>
                        setTradeSearch(e.target.value)
                      }
                      className="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-850 text-xs focus:outline-none focus:border-indigo-500 text-white"
                    />

                    <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                      {filteredTradeLibrary.map((trade) => (
                        <button
                          key={trade}
                          type="button"
                          onClick={() => {
                            if (
                              !selectedTrades.includes(trade)
                            ) {
                              setSelectedTrades((prev) => [
                                ...prev,
                                trade,
                              ]);
                            }

                            setShowAddTrade(false);
                            setTradeSearch("");
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-indigo-500 text-xs"
                        >
                          {trade}
                        </button>
                      ))}
                      {filteredTradeLibrary.length === 0 &&
                        tradeSearch.trim() !== "" && (
                          <button
                            type="button"
                            onClick={async () => {
                              const trade =
                                tradeSearch.trim();

                              if (!trade) return;

                              if (
                                !selectedTrades.includes(trade)
                              ) {
                                setSelectedTrades((prev) => [
                                  ...prev,
                                  trade,
                                ]);
                              }

                              if (
                                !tradeLibrary.some(
                                  (t) =>
                                    t.toLowerCase() ===
                                    trade.toLowerCase()
                                )
                              ) {
                                setTradeLibrary((prev) => [
                                  ...prev,
                                  trade,
                                ]);

                                const { error } =
                                  await supabase
                                    .from("trade_library")
                                    .insert({
                                      trade_name: trade,
                                    });

                                if (error) {
                                  console.error(
                                    "TRADE INSERT ERROR:",
                                    error
                                  );
                                } else { }
                              }

                              setShowAddTrade(false);
                              setTradeSearch("");
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg border border-amber-500 bg-amber-500/10 text-amber-300 text-xs"
                          >
                            + Tambah &quot;{tradeSearch}&quot;
                          </button>
                        )}
                    </div>

                  </div>
                )}

                {/* Grid Input Pecahan Pekerja (Lokal & Warga Asing) */}
                <div className="flex flex-col gap-2.5">
                  {getCurrentTrades().map((trade) => (
                    <div key={trade} className="flex flex-col gap-1.5 p-2 rounded-xl bg-zinc-900/60 border border-zinc-850/40">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-xs font-semibold text-zinc-300">{trade}</span>
                        {customTrades.includes(trade) && (
                          <button
                            type="button"
                            onClick={() => {
                              setCustomTrades(prev => prev.filter(t => t !== trade));
                              setManpower(prev => {
                                const updated = { ...prev };
                                delete updated[trade];
                                return updated;
                              });
                            }}
                            className="text-[10px] text-rose-400 hover:text-rose-300"
                            disabled={formLoading}
                          >
                            Padam
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex items-center gap-2 bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-850">
                          <span className="text-[10px] text-zinc-500 font-semibold uppercase">W.B</span>
                          <input
                            type="number"
                            placeholder="0"
                            value={manpower[trade]?.bumi || ''}
                            onChange={(e) => handleManpowerChange(trade, 'bumi', e.target.value)}
                            className="w-full bg-transparent text-xs text-white text-right focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            min="0"
                            disabled={formLoading}
                          />
                        </div>
                        <div className="flex items-center gap-2 bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-850">
                          <span className="text-[10px] text-zinc-500 font-semibold uppercase">
                            W.NB
                          </span>

                          <input
                            type="number"
                            placeholder="0"
                            value={manpower[trade]?.nonBumi || ''}
                            onChange={(e) =>
                              handleManpowerChange(
                                trade,
                                'nonBumi',
                                e.target.value
                              )
                            }
                            className="w-full bg-transparent text-xs text-white text-right focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            min="0"
                            disabled={formLoading}
                          />
                        </div>
                        <div className="flex items-center gap-2 bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-850">
                          <span className="text-[10px] text-zinc-500 font-semibold uppercase">B.W</span>
                          <input
                            type="number"
                            placeholder="0"
                            value={manpower[trade]?.foreign || ''}
                            onChange={(e) => handleManpowerChange(trade, 'foreign', e.target.value)}
                            className="w-full bg-transparent text-xs text-white text-right focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            min="0"
                            disabled={formLoading}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Catatan Aktiviti / Isu */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-400" htmlFor="notes">
                  Lokasi
                </label>
                <textarea
                  id="notes"
                  placeholder="Contoh: Aras 1, Grid B-C / 1-4, CH050 dsb."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full min-h-[100px] px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-zinc-650 resize-none"
                  disabled={formLoading}
                  required
                ></textarea>
              </div>

              {/* Butang Hantar */}
              <button
                type="submit"
                className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition-all font-semibold flex items-center justify-center shadow-lg shadow-indigo-600/20 text-sm disabled:opacity-50 mt-2"
                disabled={formLoading}
              >
                {
                  formMode === "EDIT"
                    ?
                    "💾 Simpan Kemaskini"
                    :
                    "🚀 Hantar"
                }
              </button>

              {formMode === "EDIT" && (

                <button
                  type="button"
                  onClick={() => {

                    resetToNewMode();

                    ahiSectionRef.current?.scrollIntoView({

                      behavior: "smooth",

                      block: "start",

                    });

                  }}

                  className="
                  w-full
                  h-12

                  rounded-xl

                  bg-zinc-900
                  hover:bg-zinc-800

                  text-zinc-300
                  hover:text-white

                  border
                  border-zinc-800

                  transition-all
                  "
                >
                  ↺ Batal
                </button>

              )}

            </form>
          </div>

          {/* Laporan Terkini Tapak (Site Activity Feed) */}
          <div className="flex-grow flex flex-col mb-4 mt-8">

            <div className="flex items-center justify-between">

              <h3 className="text-sm font-semibold">
                Log Hari Ini ({reports.length})
              </h3>

              <select
                value={sortMode}
                onChange={(e) =>
                  setSortMode(
                    e.target.value
                  )
                }
                className="
                      text-[10px]
                      bg-zinc-900
                      border
                      border-zinc-800
                      rounded-md
                      px-2
                      py-1
                    "
              >
                <option value="status">
                  Status Kerja
                </option>

                <option value="time">
                  Masa Daftar
                </option>

              </select>

            </div>

            <div className="mt-3 flex gap-2">

              {[
                "Semua",
                "Mula",
                "Sedang Laksana",
                "Siap",
              ].map((status) => (

                <button
                  key={status}
                  type="button"
                  onClick={() =>
                    setStatusFilter(
                      status as any
                    )
                  }
                  className={`

                      px-3
                      py-1

                      rounded-lg

                      text-[10px]

                      transition-all

                      ${statusFilter === status
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-900 text-zinc-400"
                    }

                    `}
                >
                  {status}
                </button>

              ))}

            </div>

            <div className="flex flex-col gap-4">

              <div className="h+2"></div>

              {visibleReports.map((report) => {

                const totalWB =
                  report.manpower.reduce(
                    (acc, curr) =>
                      acc + (curr.bumi_count || 0),
                    0
                  );

                const totalWNB =
                  report.manpower.reduce(
                    (acc, curr) =>
                      acc +
                      (curr.non_bumi_count || 0),
                    0
                  );

                const totalBW =
                  report.manpower.reduce(
                    (acc, curr) =>
                      acc +
                      (curr.foreign_count || 0),
                    0
                  );

                const totalWorkers =
                  totalWB +
                  totalWNB +
                  totalBW;

                const tradeNames =
                  report.manpower
                    .map(
                      (x: any) => x.trade_name
                    )
                    .join(", ");

                return (
                  <div
                    key={report.id}
                    className={`

                      flex
                      flex-col

                      p-4

                      rounded-2xl

                      bg-zinc-800/30

                      border
                      border-zinc-800/50

                      border-l-4

                      ${report.work_status ===
                        "Sedang Laksana"
                        ? "border-l-amber-500"
                        : report.work_status ===
                          "Siap"
                          ? "border-l-sky-500"
                          : "border-l-emerald-500"
                      }

                    `}
                  >
                    <div className="flex items-start justify-between gap-2">

                      <div className="flex-1 min-w-0">
                        <h4
                          className="
                            text-lg
                            font-bold
                            leading-tight
                          "
                        >
                          {report.subtask_name || report.subtask}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">

                        <button
                          type="button"

                          onClick={async () => {
                            await loadReportToForm(
                              report
                            );
                            ahiSectionRef.current?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });

                            ahiSectionRef.current
                              ?.scrollIntoView({

                                behavior: "smooth",

                                block: "start"

                              });

                          }}

                          className="
                            w-7
                            h-7
                            rounded-lg
                            flex
                            items-center
                            justify-center
                            text-zinc-400
                            hover:text-white
                            hover:bg-zinc-800
                            transition-all
                          "
                        >
                          ✏️
                        </button>

                      </div>

                    </div>

                    {/* Konteks Aktiviti */}
                    <div
                      className="
                        mt-2

                        flex
                        items-start
                        gap-1.5

                        text-[12px]

                        break-words
                      "
                    >

                      <span
                        className="
                          text-zinc-500
                          font-bold
                          shrink-0
                        "
                      >
                        @
                      </span>

                      <span
                        className="
                          text-indigo-300

                          font-medium

                          break-words

                          line-clamp-2
                        "
                      >
                        {report.ahi_display_name ||
                          report.ahi_name ||
                          report.ahi}
                      </span>

                    </div>

                    {/* Lokasi */}
                    {report.notes && (

                      <div
                        className="
                            mt-1
                            text-[11px]
                            text-zinc-300
                            font-medium
                            truncate
                          "
                        title={report.notes}
                      >
                        📍 Lokasi: {report.notes}
                      </div>

                    )}

                    {/* Pecahan Tenaga Kerja */}
                    <div className="mt-3 pt-2.5 border-t border-zinc-800/40 flex flex-col gap-1.5">
                      <div className="mt-2 flex flex-col gap-1.5 text-[9px] text-zinc-400">

                        {/* Row 1 - Ringkasan Tenaga Kerja */}
                        <div className="flex flex-col">

                          <span>

                            👷 {totalWorkers} orang

                            {" • "}

                            {tradeNames}

                          </span>

                          <span className="text-[8px] text-zinc-500">

                            WB:{totalWB}

                            {" | "}

                            WNB:{totalWNB}

                            {" | "}

                            BW:{totalBW}

                          </span>

                        </div>

                        {/* Row 2 */}
                        <div className="flex items-center gap-2">

                          <span>

                            👤 {
                              report.submitted_by
                                .split("@")[0]
                                .split(".")[0]
                                .replace(
                                  /^./,
                                  (c) => c.toUpperCase()
                                )
                            }

                            {" • "}

                            {
                              new Date(report.created_at)
                                .toLocaleString(
                                  "en-GB",
                                  {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                    hour12: false,
                                  }
                                )
                                .replace(",", "")
                            }

                          </span>

                          <div className="relative">

                            <span
                              onClick={() => {

                                setOpenedAuditId(

                                  openedAuditId === report.id
                                    ? ""
                                    : report.id

                                );

                              }}

                              className={`

                                cursor-pointer

                                transition-colors

                                ${openedAuditId === report.id
                                  ? "text-indigo-400"
                                  : report.updated_at
                                    ? "text-emerald-400"
                                    : "text-zinc-500"
                                }

                              `}
                            >
                              ⓘ
                            </span>

                            {openedAuditId === report.id && (

                              <div
                                className="
                                  absolute
                                  left-full
                                  top-1/2
                                  -translate-y-1/2

                                  ml-2

                                  text-[9px]
                                  text-zinc-400

                                  whitespace-nowrap

                                  z-50
                                "
                              >

                                <div>

                                  <span className="text-zinc-500">
                                    Asal
                                  </span>

                                  {" - "}

                                  {
                                    new Date(report.created_at)
                                      .toLocaleString("en-GB")
                                  }

                                </div>

                                {report.updated_at && (

                                  <div>

                                    <span className="text-zinc-500">
                                      Pindaan
                                    </span>

                                    {" - "}

                                    {
                                      new Date(report.updated_at)
                                        .toLocaleString("en-GB")
                                    }

                                  </div>

                                )}

                              </div>

                            )}

                          </div>

                        </div>

                      </div>
                    </div>
                  </div>
                );
              })}

              {reports.length > 10 && (

                <button
                  type="button"
                  onClick={() =>
                    setShowAllReports(
                      !showAllReports
                    )
                  }
                  className="
                    w-full
                    mt-2
                    text-sm
                    text-indigo-400
                    hover:text-indigo-300
                  "
                >
                  {showAllReports
                    ? "Sembunyi"
                    : `+ Lihat Lagi (${reports.length - 10
                    })`}
                </button>

              )}

            </div>
          </div>

        </main>

        {recallSuccess && (
          <div className="fixed top-20 right-4 z-50 rounded-xl border border-blue-500/30 bg-zinc-900 px-4 py-3 shadow-2xl">
            <div className="text-sm font-semibold text-blue-400">
              🔄 Aktiviti berjaya dimuatkan
            </div>

            <div className="text-xs text-zinc-400">
              AHI, Subtask & Tred dipulihkan
            </div>
          </div>
        )}

        {/* Navigasi Bawah */}
        <BottomNavigation />
      </div>
    </div>
  );
}
