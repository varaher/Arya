import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserAuth } from "@/lib/user-auth";
import { requestNotificationPermission } from "@/lib/push-notifications";
import {
  Bell, Plus, Trash2, X, Clock, Droplets, Briefcase,
  Pill, Dumbbell, AlarmClock, ChevronDown, ChevronUp, Check
} from "lucide-react";

interface Reminder {
  id: string;
  title: string;
  message: string;
  type: string;
  scheduledAt: string;
  recurrence: string;
  recurrenceMinutes?: number;
  isActive: boolean;
  soundEnabled: boolean;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  alarm: <AlarmClock className="w-4 h-4" />,
  reminder: <Bell className="w-4 h-4" />,
  water: <Droplets className="w-4 h-4" />,
  work: <Briefcase className="w-4 h-4" />,
  medicine: <Pill className="w-4 h-4" />,
  exercise: <Dumbbell className="w-4 h-4" />,
  custom: <Bell className="w-4 h-4" />,
};

const TYPE_COLORS: Record<string, string> = {
  alarm: "text-red-400",
  reminder: "text-cyan-400",
  water: "text-blue-400",
  work: "text-amber-400",
  medicine: "text-green-400",
  exercise: "text-purple-400",
  custom: "text-gray-400",
};

const QUICK_TEMPLATES = [
  { label: "Drink Water", type: "water", title: "Drink Water 💧", message: "Time to hydrate! Drink a glass of water.", recurrence: "custom", recurrenceMinutes: 120 },
  { label: "Take Medicine", type: "medicine", title: "Medicine Reminder 💊", message: "Don't forget to take your medicine.", recurrence: "daily" },
  { label: "Exercise", type: "exercise", title: "Workout Time 🏃", message: "Time for your daily exercise!", recurrence: "daily" },
  { label: "Work Break", type: "work", title: "Take a Break 💼", message: "Step away from your screen for 5 minutes.", recurrence: "custom", recurrenceMinutes: 60 },
];

function formatRecurrence(reminder: Reminder): string {
  if (reminder.recurrence === "once") return "One time";
  if (reminder.recurrence === "daily") return "Every day";
  if (reminder.recurrence === "weekly") return "Every week";
  if (reminder.recurrence === "hourly") return "Every hour";
  if (reminder.recurrence === "custom" && reminder.recurrenceMinutes) {
    const h = Math.floor(reminder.recurrenceMinutes / 60);
    const m = reminder.recurrenceMinutes % 60;
    if (h > 0 && m > 0) return `Every ${h}h ${m}m`;
    if (h > 0) return `Every ${h} hour${h > 1 ? "s" : ""}`;
    return `Every ${m} min`;
  }
  return reminder.recurrence;
}

function formatTime(dt: string): string {
  return new Date(dt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export default function RemindersPanel({ onClose }: { onClose: () => void }) {
  const { token, isLoggedIn } = useUserAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "reminder",
    scheduledAt: "",
    recurrence: "once",
    recurrenceMinutes: 60,
    soundEnabled: true,
  });

  useEffect(() => {
    if ("Notification" in window) setNotifPermission(Notification.permission);
    if (isLoggedIn && token) loadReminders();
  }, [isLoggedIn, token]);

  async function loadReminders() {
    try {
      const res = await fetch("/api/reminders", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setReminders(await res.json());
    } catch {}
    setLoading(false);
  }

  async function enableNotifications() {
    if (!token) return;
    const perm = await requestNotificationPermission(token);
    setNotifPermission(perm);
  }

  async function createReminder(data?: typeof QUICK_TEMPLATES[0]) {
    if (!token) return;
    const now = new Date();
    const defaultSchedule = new Date(now.getTime() + 5 * 60 * 1000).toISOString().slice(0, 16);

    const payload = data
      ? {
          title: data.title,
          message: data.message,
          type: data.type,
          scheduledAt: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
          recurrence: data.recurrence,
          recurrenceMinutes: data.recurrenceMinutes,
          isActive: true,
          soundEnabled: true,
        }
      : {
          ...form,
          scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : defaultSchedule,
        };

    const res = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const created = await res.json();
      setReminders((prev) => [created, ...prev]);
      setShowForm(false);
      setForm({ title: "", message: "", type: "reminder", scheduledAt: "", recurrence: "once", recurrenceMinutes: 60, soundEnabled: true });
    }
  }

  async function toggleReminder(id: string, isActive: boolean) {
    if (!token) return;
    await fetch(`/api/reminders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isActive }),
    });
    setReminders((prev) => prev.map((r) => r.id === id ? { ...r, isActive } : r));
  }

  async function deleteReminder(id: string) {
    if (!token) return;
    await fetch(`/api/reminders/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }

  const activeReminders = reminders.filter((r) => r.isActive);
  const inactiveReminders = reminders.filter((r) => !r.isActive);

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-[#0d1326] border-l border-white/10 flex flex-col shadow-2xl"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-semibold text-white">Reminders & Alarms</h2>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {notifPermission !== "granted" && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-3">
            <Bell className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-amber-300 font-medium">Enable notifications</p>
              <p className="text-xs text-amber-400/70 mt-0.5">Allow notifications so ARYA can remind you even when the app is in the background.</p>
              <Button
                size="sm"
                onClick={enableNotifications}
                className="mt-2 bg-amber-500 hover:bg-amber-400 text-black text-xs h-7 px-3"
              >
                Enable Now
              </Button>
            </div>
          </div>
        )}

        {notifPermission === "granted" && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-2">
            <Check className="w-4 h-4 text-green-400 shrink-0" />
            <p className="text-xs text-green-300">Notifications enabled — ARYA will alert you even in background</p>
          </div>
        )}

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Quick Add</p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_TEMPLATES.map((t) => (
              <button
                key={t.label}
                onClick={() => createReminder(t)}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-left transition-colors"
              >
                <span className={TYPE_COLORS[t.type]}>{TYPE_ICONS[t.type]}</span>
                <span className="text-xs text-white">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-xl transition-colors"
        >
          <div className="flex items-center gap-2 text-cyan-400">
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Custom Reminder</span>
          </div>
          {showForm ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4 text-cyan-400" />}
        </button>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Title</label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Morning Walk"
                    className="bg-background/50 border-white/10 text-white text-sm h-9"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Message</label>
                  <Input
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="What should I remind you?"
                    className="bg-background/50 border-white/10 text-white text-sm h-9"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full bg-background/50 border border-white/10 rounded-md text-white text-sm h-9 px-2"
                    >
                      <option value="reminder">Reminder</option>
                      <option value="alarm">Alarm</option>
                      <option value="water">Water</option>
                      <option value="work">Work</option>
                      <option value="medicine">Medicine</option>
                      <option value="exercise">Exercise</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Repeat</label>
                    <select
                      value={form.recurrence}
                      onChange={(e) => setForm({ ...form, recurrence: e.target.value })}
                      className="w-full bg-background/50 border border-white/10 rounded-md text-white text-sm h-9 px-2"
                    >
                      <option value="once">Once</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="hourly">Hourly</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>
                {form.recurrence === "custom" && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Every (minutes)</label>
                    <Input
                      type="number"
                      value={form.recurrenceMinutes}
                      onChange={(e) => setForm({ ...form, recurrenceMinutes: parseInt(e.target.value) || 60 })}
                      min={5}
                      className="bg-background/50 border-white/10 text-white text-sm h-9"
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">When</label>
                  <Input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                    className="bg-background/50 border-white/10 text-white text-sm h-9"
                  />
                </div>
                <Button
                  onClick={() => createReminder()}
                  disabled={!form.title || !form.message}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white h-9 text-sm"
                >
                  Create Reminder
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading reminders...</div>
        ) : (
          <>
            {activeReminders.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Active ({activeReminders.length})</p>
                <div className="space-y-2">
                  {activeReminders.map((r) => (
                    <ReminderCard key={r.id} reminder={r} onToggle={toggleReminder} onDelete={deleteReminder} />
                  ))}
                </div>
              </div>
            )}
            {activeReminders.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>No active reminders.</p>
                <p className="text-xs mt-1">Use Quick Add or ask ARYA in chat!</p>
              </div>
            )}
            {inactiveReminders.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Completed/Inactive</p>
                <div className="space-y-2">
                  {inactiveReminders.slice(0, 5).map((r) => (
                    <ReminderCard key={r.id} reminder={r} onToggle={toggleReminder} onDelete={deleteReminder} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

function ReminderCard({ reminder, onToggle, onDelete }: {
  reminder: Reminder;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const icon = TYPE_ICONS[reminder.type] || TYPE_ICONS.reminder;
  const color = TYPE_COLORS[reminder.type] || TYPE_COLORS.reminder;

  return (
    <div className={`flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 transition-opacity ${!reminder.isActive ? "opacity-50" : ""}`}>
      <span className={color}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{reminder.title}</p>
        <p className="text-xs text-muted-foreground">{formatRecurrence(reminder)} · {formatTime(reminder.scheduledAt)}</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onToggle(reminder.id, !reminder.isActive)}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${reminder.isActive ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}
          title={reminder.isActive ? "Pause" : "Resume"}
        >
          {reminder.isActive ? <Check className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => onDelete(reminder.id)}
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
