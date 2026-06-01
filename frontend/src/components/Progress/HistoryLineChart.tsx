import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Box, Typography } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { CompetencyCriteria } from '../../types';

interface Props {
  criteria: CompetencyCriteria[];
  history: { date: string; scores: Record<string, number> }[];
}

const COLORS = ['#7C6BAE', '#9B8EC4', '#B5A8D5', '#6B5A97', '#A597D8', '#8B7BC8', '#C0B4E4', '#5A4A7F'];

const AVG_COLOR = '#F59E0B';
const AVG_KEY = 'Среднее';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    const avgEntry = payload.find((p: any) => p.name === AVG_KEY);
    const others = payload.filter((p: any) => p.name !== AVG_KEY);
    return (
      <Box sx={{ bgcolor: 'white', border: '1px solid #D5C9EE', borderRadius: 2, px: 2, py: 1.5, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', minWidth: 160 }}>
        <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>{label}</Typography>
        {avgEntry && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 3, mb: 0.5, pb: 0.5, borderBottom: '1px solid #F0EBF8' }}>
            <Typography variant="caption" fontWeight={700} sx={{ color: AVG_COLOR }}>{AVG_KEY}</Typography>
            <Typography variant="caption" fontWeight={800} sx={{ color: AVG_COLOR }}>{avgEntry.value}/10</Typography>
          </Box>
        )}
        {others.map((p: any) => (
          <Box key={p.name} sx={{ display: 'flex', justifyContent: 'space-between', gap: 3 }}>
            <Typography variant="caption" sx={{ color: p.color }}>{p.name}</Typography>
            <Typography variant="caption" fontWeight={700}>{p.value}/10</Typography>
          </Box>
        ))}
      </Box>
    );
  }
  return null;
};

export default function HistoryLineChart({ criteria, history }: Props) {
  if (!history.length) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260, color: 'text.secondary', textAlign: 'center' }}>
        <Box>
          <TrendingUpIcon sx={{ fontSize: 44, mb: 1, color: '#D5C9EE' }} />
          <Typography variant="body2">История оценок пока пуста</Typography>
        </Box>
      </Box>
    );
  }

  const data = history.map((h) => {
    const scores = criteria.map((c) => h.scores[c.id]).filter((v): v is number => v != null);
    const avg = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
    return {
      date: (() => { try { return format(parseISO(h.date), 'd MMM', { locale: ru }); } catch { return h.date; } })(),
      ...criteria.reduce((acc, c) => ({ ...acc, [c.name]: h.scores[c.id] ?? null }), {}),
      [AVG_KEY]: avg,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EDE9F7" />
        <XAxis dataKey="date" tick={{ fill: '#8B7BC8', fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 10]} tick={{ fill: '#8B7BC8', fontSize: 12 }} tickLine={false} axisLine={false} tickCount={6} />
        <ReferenceLine y={5} stroke="#C0B4E4" strokeDasharray="4 2" />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 13, color: '#6B5A97', paddingTop: 12 }} />
        {criteria.map((c, i) => (
          <Line key={c.id} type="monotone" dataKey={c.name}
            stroke={COLORS[i % COLORS.length]} strokeWidth={2}
            dot={{ fill: COLORS[i % COLORS.length], r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5 }} connectNulls />
        ))}
        <Line
          type="monotone"
          dataKey={AVG_KEY}
          stroke={AVG_COLOR}
          strokeWidth={2.5}
          strokeDasharray="6 3"
          dot={{ fill: AVG_COLOR, r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
