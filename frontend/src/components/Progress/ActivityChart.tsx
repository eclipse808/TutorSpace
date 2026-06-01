import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Box, Typography } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

interface WeekBucket { week: string; count: number; }

interface Props { data: WeekBucket[]; }

const LAVENDER = '#7C5CBF';
const LAVENDER_LIGHT = '#C0B4E4';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    const count = payload[0].value as number;
    return (
      <Box sx={{ bgcolor: 'white', border: '1px solid #D5C9EE', borderRadius: 2, px: 2, py: 1.5, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <Typography variant="caption" fontWeight={700} display="block" mb={0.25}>{label}</Typography>
        <Typography variant="caption" color="text.secondary">
          {count === 0 ? 'Нет занятий' : count === 1 ? '1 занятие' : count < 5 ? `${count} занятия` : `${count} занятий`}
        </Typography>
      </Box>
    );
  }
  return null;
};

export default function ActivityChart({ data }: Props) {
  const totalSessions = data.reduce((s, w) => s + w.count, 0);
  const activeWeeks = data.filter((w) => w.count > 0).length;
  const maxCount = Math.max(...data.map((w) => w.count), 1);

  const chartData = data.map((w) => ({
    label: (() => { try { return format(parseISO(w.week), 'd MMM', { locale: ru }); } catch { return w.week; } })(),
    count: w.count,
  }));

  if (totalSessions === 0) {
    return (
      <Box sx={{ height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
        <CalendarMonthIcon sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
        <Typography variant="body2">Нет завершённых занятий за последние 12 недель</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="primary">{totalSessions}</Typography>
          <Typography variant="caption" color="text.secondary">занятий за 12 нед.</Typography>
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={800} color="primary">{activeWeeks}</Typography>
          <Typography variant="caption" color="text.secondary">активных недель</Typography>
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={800} color="primary">
            {(totalSessions / 12).toFixed(1)}
          </Typography>
          <Typography variant="caption" color="text.secondary">в среднем / нед.</Typography>
        </Box>
      </Box>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }} barSize={18}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EDE9F7" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#8B7BC8', fontSize: 11 }} tickLine={false} axisLine={false} interval={1} />
          <YAxis allowDecimals={false} tick={{ fill: '#8B7BC8', fontSize: 11 }} tickLine={false} axisLine={false} tickCount={Math.min(maxCount + 1, 6)} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F7F5FC' }} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.count > 0 ? LAVENDER : LAVENDER_LIGHT} fillOpacity={entry.count > 0 ? 1 : 0.35} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
