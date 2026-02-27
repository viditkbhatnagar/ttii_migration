import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { firstDay, daysInMonth };
}

export default function GlobalCalendarPage({ api, session }: AdminPageProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const fromDate = useMemo(() => {
    const d = new Date(viewYear, viewMonth, 1);
    return d.toISOString().slice(0, 10);
  }, [viewYear, viewMonth]);

  const toDate = useMemo(() => {
    const d = new Date(viewYear, viewMonth + 1, 0);
    return d.toISOString().slice(0, 10);
  }, [viewYear, viewMonth]);

  const { data, loading, error } = useAdminPageData(
    () => api.loadGlobalCalendar(session.token, fromDate, toDate),
    [fromDate, toDate],
  );

  const allEvents = useMemo(() => toRecords(data), [data]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, typeof allEvents> = {};
    for (const evt of allEvents) {
      const dateStr = asString(evt.event_date).slice(0, 10);
      if (dateStr) {
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(evt);
      }
    }
    return map;
  }, [allEvents]);

  const { firstDay, daysInMonth } = getMonthDays(viewYear, viewMonth);

  const handlePrev = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNext = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const typeColor: Record<string, string> = {
    live_class: 'bg-blue-100 text-blue-800',
    exam: 'bg-red-100 text-red-800',
    event: 'bg-green-100 text-green-800',
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );
  }

  const todayStr = today.toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Global Calendar" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Events This Month', value: allEvents.length },
          { label: 'Live Classes', value: allEvents.filter((e) => asString(e.event_type) === 'live_class').length },
          { label: 'Exams & Events', value: allEvents.filter((e) => asString(e.event_type) !== 'live_class').length },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrev}
              className="px-3 py-1 text-sm rounded border hover:bg-gray-50"
            >
              Prev
            </button>
            <h2 className="text-lg font-semibold">
              {MONTHS[viewMonth]} {viewYear}
            </h2>
            <button
              type="button"
              onClick={handleNext}
              className="px-3 py-1 text-sm rounded border hover:bg-gray-50"
            >
              Next
            </button>
          </div>

          <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded">
            {WEEKDAYS.map((day) => (
              <div key={day} className="bg-gray-50 p-2 text-center text-xs font-medium text-gray-600">
                {day}
              </div>
            ))}

            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-white p-2 min-h-[80px]" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = eventsByDate[dateStr] || [];
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={day}
                  className={`bg-white p-2 min-h-[80px] ${isToday ? 'ring-2 ring-blue-400 ring-inset' : ''}`}
                >
                  <div className={`text-xs font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((evt, idx) => (
                      <div
                        key={idx}
                        className={`text-[10px] px-1 py-0.5 rounded truncate ${typeColor[asString(evt.event_type)] || 'bg-gray-100 text-gray-700'}`}
                        title={`${asString(evt.title)} (${asString(evt.from_time)} - ${asString(evt.to_time)})`}
                      >
                        {asString(evt.title)}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-gray-500">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
