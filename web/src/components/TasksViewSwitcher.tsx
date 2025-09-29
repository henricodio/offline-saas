"use client";

import React from "react";
import TasksAgenda from "./TasksAgenda";
import TasksWeek from "./TasksWeek";

export default function TasksViewSwitcher() {
  const [view, setView] = React.useState<"agenda" | "week">("agenda");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center rounded-md bg-[var(--muted)] p-0.5">
          <button
            type="button"
            className={`btn btn-sm ${view === 'agenda' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setView('agenda')}
            aria-pressed={view === 'agenda'}
          >
            Agenda
          </button>
          <button
            type="button"
            className={`btn btn-sm ${view === 'week' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setView('week')}
            aria-pressed={view === 'week'}
          >
            Semana
          </button>
        </div>
      </div>

      {view === 'agenda' ? <TasksAgenda /> : <TasksWeek />}
    </div>
  );
}
