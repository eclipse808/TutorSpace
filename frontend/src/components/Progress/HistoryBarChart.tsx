import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, ResponsiveContainer, LabelList
} from 'recharts';
import { Box, Typography } from '@mui/material';
import { CompetencyCriteria } from '../../types';

interface Props {
  criteria: CompetencyCriteria[];
  currentScores: Record<string, number>;
}

const COLORS = ['#7C6BAE', '#8B7BC8', '#9B8EC4', '#A597D8', '#B5A8D5', '#C0B4E4', '#6B5A97', '#5A4A7F'];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    const score = payload[0].value as number;
    const label = score >= 9 ? 'Почти эксперт' : score >= 7 ? 'Уверенный прогресс' : score >= 5 ? 'На полпути' : score >= 3 ? 'Начинающий' : 'Старт';
    return (
      <Box sx={{ bgcolor: 'white', border: '1px solid #D5C9EE', borderRadius: 2, px: 2, py: 1.5, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <Typography variant="caption" fontWeight={700} display="block">{payload[0].payload.name}</Typography>
        <Typography variant="caption" display="block">Уровень: <strong>{score}/10</strong></Typography>
        <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      </Box>
    );
  }
  return null;
};

export default function HistoryBarChart({ criteria, currentScores }: Props) {
  const data = criteria.map((c, i) => ({
    name: c.name,
    score: currentScores[c.id] ?? 0,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 20, right: 20, bottom: 10, left: 0 }} barSize={44}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EDE9F7" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: '#6B5A97', fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 10]} tick={{ fill: '#8B7BC8', fontSize: 12 }} tickLine={false} axisLine={false} tickCount={6} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F7F5FC' }} />
        <Bar dataKey="score" radius={[8, 8, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
          <LabelList dataKey="score" position="top" style={{ fill: '#6B5A97', fontSize: 13, fontWeight: 600 }} formatter={(v: number) => `${v}/10`} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
