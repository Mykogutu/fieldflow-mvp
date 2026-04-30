"use client";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PALETTE = [
  { bg: "bg-[#DBEAFE]",    text: "text-[#1E40AF]",    dot: "bg-[#3B82F6]"    },
  { bg: "bg-emerald-100", text: "text-emerald-800",  dot: "bg-emerald-500" },
  { bg: "bg-[#FEF3C7]",   text: "text-[#92400E]",    dot: "bg-[#F59E0B]"   },
  { bg: "bg-violet-100",  text: "text-violet-800",   dot: "bg-violet-500"  },
  { bg: "bg-[#FFE4E6]",    text: "text-[#9F1239]",     dot: "bg-[#EF4444]"    },
  { bg: "bg-[#CFFAFE]",    text: "text-[#155E75]",     dot: "bg-[#06B6D4]"    },
  { bg: "bg-[#FFEDD5]",  text: "text-[#9A3412]",   dot: "bg-[#F97316]"  },
  { bg: "bg-pink-100",    text: "text-pink-800",     dot: "bg-pink-500"    },
  { bg: "bg-lime-100",    text: "text-lime-800",     dot: "bg-lime-600"    },
  { bg: "bg-teal-100",    text: "text-teal-800",     dot: "bg-teal-500"    },
];

export interface CalendarWorker { id: string; name: string }
export interface CalendarJob {
  id: string;
  clientName: string;
  jobType: string;
  scheduledDate: string;
  workerIds: string[];
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WorkCalendar({
  workers,
  jobs,
  weekStartISO,
}: {
  workers: CalendarWorker[];
  jobs: CalendarJob[];
  weekStartISO: string;
}) {
  const router = useRouter();

  const weekStart = new Date(weekStartISO);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const colorMap = new Map<string, (typeof PALETTE)[0]>(
    workers.map((w, i) => [w.id, PALETTE[i % PALETTE.length]])
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function navigate(delta: number) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    router.push(`/admin?week=${d.toISOString().slice(0, 10)}`, { scroll: false });
  }

  const label = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    d.toLocaleDateString("en-GB", opts);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-semibold text-slate-900">Work Calendar</h2>
        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-[#F1F5F9] rounded-lg transition-colors text-[#94A3B8] hover:text-[#334155]"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin", { scroll: false })}
            className="px-3 py-1.5 text-xs font-medium text-[#475569] hover:bg-[#F1F5F9] rounded-lg transition-colors border border-gray-200 hover:border-gray-300"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => navigate(1)}
            className="p-1.5 hover:bg-[#F1F5F9] rounded-lg transition-colors text-[#94A3B8] hover:text-[#334155]"
            aria-label="Next week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-xs text-[#94A3B8] font-medium ml-2 whitespace-nowrap">
            {label(weekStart, { day: "numeric", month: "short" })}
            {" – "}
            {label(days[6], { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 min-w-[560px] divide-x divide-gray-100">
          {days.map((day, i) => {
            const dayStr = day.toISOString().slice(0, 10);
            const isToday =
              day.getFullYear() === today.getFullYear() &&
              day.getMonth() === today.getMonth() &&
              day.getDate() === today.getDate();
            const isWeekend = i >= 5;
            const dayJobs = jobs.filter(
              (j) => j.scheduledDate.slice(0, 10) === dayStr
            );

            return (
              <div
                key={dayStr}
                className={
                  isToday
                    ? "bg-[#EFF6FF]/30"
                    : isWeekend
                    ? "bg-[#F8FAFC]/50"
                    : ""
                }
              >
                {/* Day header */}
                <div
                  className={`px-2 py-2.5 text-center border-b border-gray-100 ${
                    isToday ? "bg-[#EFF6FF]" : ""
                  }`}
                >
                  <p
                    className={`text-[10px] font-semibold uppercase tracking-widest ${
                      isToday ? "text-[#3B82F6]" : "text-[#94A3B8]"
                    }`}
                  >
                    {DAY_NAMES[i]}
                  </p>
                  {isToday ? (
                    <span className="mt-0.5 text-xs font-bold bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center mx-auto">
                      {day.getDate()}
                    </span>
                  ) : (
                    <p
                      className={`text-sm font-semibold mt-0.5 ${
                        isWeekend ? "text-[#94A3B8]" : "text-[#334155]"
                      }`}
                    >
                      {day.getDate()}
                    </p>
                  )}
                </div>

                {/* Job pills */}
                <div className="p-1.5 space-y-1 min-h-[120px]">
                  {dayJobs.length === 0 && (
                    <div className="mt-4 mx-1 border-t border-gray-100" />
                  )}
                  {dayJobs.map((job) => {
                    const wid = job.workerIds[0];
                    const color = wid
                      ? (colorMap.get(wid) ?? PALETTE[0])
                      : {
                          bg: "bg-[#F1F5F9]",
                          text: "text-[#64748B]",
                          dot: "bg-slate-400",
                        };
                    return (
                      <div
                        key={job.id}
                        className={`${color.bg} ${color.text} rounded-lg px-2 py-1.5 text-[10px] leading-tight`}
                        title={`${job.clientName} · ${job.jobType}`}
                      >
                        <p className="font-medium truncate">{job.clientName}</p>
                        <p className="opacity-60 truncate text-[9px] mt-0.5">
                          {job.jobType}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      {workers.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-1.5">
          {workers.map((w, i) => {
            const c = PALETTE[i % PALETTE.length];
            return (
              <div key={w.id} className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`}
                />
                <span className="text-xs text-[#475569]">{w.name}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />
            <span className="text-xs text-[#94A3B8]">Unassigned</span>
          </div>
        </div>
      )}
    </div>
  );
}
