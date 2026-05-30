import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import { Box, Typography } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import { CompetencyCriteria } from '../../types';

interface Props {
  criteria: CompetencyCriteria[];
  currentScores: Record<string, number>;
  previousScores?: Record<string, number>;
  showComparison?: boolean;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    return (
      <Box sx={{ bgcolor: 'white', border: '1px solid #D5C9EE', borderRadius: 2, px: 2, py: 1.5, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <Typography variant="caption" fontWeight={700} color="text.primary" display="block" mb={0.5}>
          {payload[0]?.payload?.subject}
        </Typography>
        {payload.map((p: any) => (
          <Typography key={p.name} variant="caption" display="block" sx={{ color: p.color }}>
            {p.name}: <strong>{p.value}/10</strong>
          </Typography>
        ))}
      </Box>
    );
  }
  return null;
};

export default function CompetencyRadar({ criteria, currentScores, previousScores, showComparison }: Props) {
  if (!criteria.length) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320, color: 'text.secondary', textAlign: 'center' }}>
        <Box>
          <BarChartIcon sx={{ fontSize: 52, mb: 1, color: '#D5C9EE' }} />
          <Typography variant="body1" fontWeight={500}>Нет данных для отображения</Typography>
          <Typography variant="body2" color="text.secondary">Репетитор ещё не выставил оценки</Typography>
        </Box>
      </Box>
    );
  }

  const data = criteria.map((c) => ({
    subject: c.name,
    criteriaId: c.id,
    Сейчас: currentScores[c.id] ?? 0,
    ...(showComparison && previousScores && { 'Прошлый период': previousScores[c.id] ?? 0 }),
  }));

  const hasPrev = showComparison && previousScores && Object.keys(previousScores).length > 0;

  return (
    <ResponsiveContainer width="100%" height={380}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="#E8E3F3" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#6B5A97', fontSize: 13, fontWeight: 500 }} tickLine={false} />
        <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: '#A597D8', fontSize: 11 }} tickCount={6} axisLine={false} />
        {hasPrev && (
          <Radar name="Прошлый период" dataKey="Прошлый период"
            stroke="#C0B4E4" fill="#C0B4E4" fillOpacity={0.2} strokeWidth={1.5} strokeDasharray="4 2" />
        )}
        <Radar name="Сейчас" dataKey="Сейчас"
          stroke="#7C6BAE" fill="#7C6BAE" fillOpacity={0.35} strokeWidth={2.5}
          dot={{ fill: '#7C6BAE', r: 4 }} />
        <Tooltip content={<CustomTooltip />} />
        {hasPrev && <Legend wrapperStyle={{ fontSize: 13, color: '#6B5A97' }} />}
      </RadarChart>
    </ResponsiveContainer>
  );
}
