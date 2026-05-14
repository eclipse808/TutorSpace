import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Box, Typography, Card, CardContent } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { Achievement } from '../../types';

interface Props {
  achievement: Achievement;
  locked?: boolean;
}

export default function AchievementCard({ achievement, locked }: Props) {
  return (
    <Card elevation={locked ? 0 : 1}
      sx={{ position: 'relative', textAlign: 'center', opacity: locked ? 0.6 : 1, border: locked ? '1px solid #EEE9F8' : '1px solid #D5C9EE', bgcolor: locked ? '#F7F5FC' : 'white', transition: 'all 0.2s', '&:hover': locked ? {} : { boxShadow: '0 4px 12px rgba(124,92,191,0.15)' } }}>
      {locked && (
        <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
          <LockIcon sx={{ fontSize: 13, color: '#C0B4E4' }} />
        </Box>
      )}
      <CardContent sx={{ p: 2 }}>
        <Typography sx={{ fontSize: '1.8rem', mb: 1, filter: locked ? 'grayscale(1)' : 'none', opacity: locked ? 0.5 : 1 }}>
          {achievement.icon}
        </Typography>
        <Typography variant="caption" fontWeight={600} color={locked ? 'text.disabled' : 'text.primary'} display="block" sx={{ lineHeight: 1.3, mb: 0.5 }}>
          {achievement.name}
        </Typography>
        <Typography variant="caption" color={locked ? 'text.disabled' : 'text.secondary'} sx={{ fontSize: 10, lineHeight: 1.3 }}>
          {achievement.description}
        </Typography>
        {!locked && achievement.earnedAt && (
          <Typography variant="caption" color="primary" display="block" sx={{ mt: 1, fontWeight: 500, fontSize: 10 }}>
            {format(parseISO(achievement.earnedAt), 'd MMM yyyy', { locale: ru })}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
