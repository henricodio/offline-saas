import TasksWeek from "@/components/TasksWeek";

export default function TasksWeekPage() {
  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="toolbar flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Agenda semanal</h1>
        <div className="text-xs text-[var(--muted-foreground)]">Planificación por semana</div>
      </div>
      <section>
        <TasksWeek />
      </section>
    </main>
  );
}
