import { PrismaClient, Role, SessionStatus, AchievementType, TutorStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(10, 0, 0, 0);
  return d;
}

async function main() {
  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  // Admin user
  await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      password: hash('admin123'),
      name: 'Администратор',
      role: Role.ADMIN,
      avatar: 'AD',
    },
  });

  // Achievements
  const achievements = await Promise.all([
    prisma.achievement.create({ data: { name: 'Первый шаг', description: 'Первое занятие пройдено!', icon: '🌱', type: AchievementType.ATTENDANCE, sessionsRequired: 1 } }),
    prisma.achievement.create({ data: { name: 'На полпути', description: 'Одна из компетенций достигла уровня 5/10', icon: '🎯', type: AchievementType.SCORE_MILESTONE, threshold: 5 } }),
    prisma.achievement.create({ data: { name: 'Уверенный прогресс', description: 'Одна из компетенций достигла уровня 7/10', icon: '🚀', type: AchievementType.SCORE_MILESTONE, threshold: 7 } }),
    prisma.achievement.create({ data: { name: 'Почти эксперт', description: 'Одна из компетенций достигла уровня 9/10', icon: '⭐', type: AchievementType.SCORE_MILESTONE, threshold: 9 } }),
    prisma.achievement.create({ data: { name: 'Эксперт!', description: 'Достигнут максимальный уровень 10/10', icon: '👑', type: AchievementType.SCORE_MILESTONE, threshold: 10 } }),
    prisma.achievement.create({ data: { name: 'Прилежный ученик', description: '5 занятий пройдено', icon: '📚', type: AchievementType.ATTENDANCE, sessionsRequired: 5 } }),
    prisma.achievement.create({ data: { name: 'Постоянный студент', description: '10 занятий пройдено', icon: '🏆', type: AchievementType.ATTENDANCE, sessionsRequired: 10 } }),
    prisma.achievement.create({ data: { name: 'Страсть к знаниям', description: '20 занятий пройдено', icon: '💫', type: AchievementType.ATTENDANCE, sessionsRequired: 20 } }),
    prisma.achievement.create({ data: { name: 'Полиглот', description: 'Занятия по 2 или более предметам', icon: '🌍', type: AchievementType.SPECIAL } }),
    prisma.achievement.create({ data: { name: 'Три в ряд', description: '3 занятия на одной неделе', icon: '🔥', type: AchievementType.STREAK } }),
  ]);

  const [achFirst, achHalf, achProgress, achExpert, achMaster, achDiligent, achConstant, achPassion, achPolyglot, achStreak] = achievements;

  // Tutors
  const mariaUser = await prisma.user.create({
    data: {
      email: 'maria@demo.com',
      password: hash('password123'),
      name: 'Мария Петрова',
      role: Role.TUTOR,
      avatar: 'MP',
      tutorProfile: {
        create: {
          bio: 'Преподаю английский язык более 8 лет. Специализируюсь на разговорной речи и подготовке к международным экзаменам (IELTS, TOEFL). Мои ученики успешно сдают экзамены и свободно общаются на английском.',
          subjects: ['Английский язык', 'Французский язык'],
          hourlyRate: 1500,
          experience: 8,
          rating: 4.9,
          reviewCount: 47,
          status: TutorStatus.APPROVED,
          education: 'МГУ, факультет иностранных языков',
        },
      },
    },
    include: { tutorProfile: true },
  });

  const ivanUser = await prisma.user.create({
    data: {
      email: 'ivan@demo.com',
      password: hash('password123'),
      name: 'Иван Кузнецов',
      role: Role.TUTOR,
      avatar: 'ИК',
      tutorProfile: {
        create: {
          bio: 'Кандидат физико-математических наук, доцент. Преподаю математику для школьников и студентов уже 12 лет. Подготовка к ЕГЭ/ОГЭ с гарантированным результатом.',
          subjects: ['Математика', 'Алгебра', 'Геометрия'],
          hourlyRate: 1800,
          experience: 12,
          rating: 4.8,
          reviewCount: 63,
          status: TutorStatus.APPROVED,
          education: 'МГУ, механико-математический факультет, к.ф.-м.н.',
        },
      },
    },
    include: { tutorProfile: true },
  });

  const alexeiUser = await prisma.user.create({
    data: {
      email: 'alexei@demo.com',
      password: hash('password123'),
      name: 'Алексей Смирнов',
      role: Role.TUTOR,
      avatar: 'АС',
      tutorProfile: {
        create: {
          bio: 'Физик-экспериментатор с опытом преподавания 6 лет. Объясняю сложные концепции простым языком. Специализируюсь на подготовке к олимпиадам и ЕГЭ по физике.',
          subjects: ['Физика', 'Химия'],
          hourlyRate: 1700,
          experience: 6,
          rating: 4.7,
          reviewCount: 31,
          status: TutorStatus.APPROVED,
          education: 'МФТИ, факультет общей и прикладной физики',
        },
      },
    },
    include: { tutorProfile: true },
  });

  // Extra catalog tutors (no sessions needed, just profiles)
  await Promise.all([
    prisma.user.create({
      data: {
        email: 'olga@demo.com', password: hash('password123'), name: 'Ольга Белова', role: Role.TUTOR, avatar: 'ОБ',
        tutorProfile: { create: {
          bio: 'Преподаю русский язык и литературу 9 лет. Авторская методика подготовки к сочинению ЕГЭ — ученики стабильно набирают 85+ баллов. Работаю со всеми классами.',
          subjects: ['Русский язык', 'Литература'], hourlyRate: 1400, experience: 9,
          rating: 4.8, reviewCount: 56, status: TutorStatus.APPROVED,
          education: 'МГУ, факультет филологии',
        }},
      },
    }),
    prisma.user.create({
      data: {
        email: 'sergei@demo.com', password: hash('password123'), name: 'Сергей Громов', role: Role.TUTOR, avatar: 'СГ',
        tutorProfile: { create: {
          bio: 'Разработчик с 10 годами опыта, преподаю информатику и программирование 5 лет. Python, алгоритмы, подготовка к ЕГЭ и олимпиадам по информатике.',
          subjects: ['Информатика'], hourlyRate: 2200, experience: 5,
          rating: 4.9, reviewCount: 28, status: TutorStatus.APPROVED,
          education: 'МФТИ, факультет прикладной математики и информатики',
        }},
      },
    }),
    prisma.user.create({
      data: {
        email: 'anastasia@demo.com', password: hash('password123'), name: 'Анастасия Лебедева', role: Role.TUTOR, avatar: 'АЛ',
        tutorProfile: { create: {
          bio: 'Биолог и химик с 6-летним опытом преподавания. Объясняю сложные темы простым языком. Специализируюсь на подготовке к ОГЭ и ЕГЭ.',
          subjects: ['Биология', 'Химия'], hourlyRate: 1350, experience: 6,
          rating: 4.7, reviewCount: 33, status: TutorStatus.APPROVED,
          education: 'Первый МГМУ им. Сеченова, биохимический факультет',
        }},
      },
    }),
    prisma.user.create({
      data: {
        email: 'timur@demo.com', password: hash('password123'), name: 'Тимур Ахметов', role: Role.TUTOR, avatar: 'ТА',
        tutorProfile: { create: {
          bio: 'Сертифицированный преподаватель английского (CELTA). Коммуникативная методика, бизнес-английский, подготовка к IELTS и Cambridge. Провёл 3 года в Лондоне.',
          subjects: ['Английский язык'], hourlyRate: 1900, experience: 7,
          rating: 4.8, reviewCount: 44, status: TutorStatus.APPROVED,
          education: 'МГЛУ, факультет английского языка; CELTA Cambridge',
        }},
      },
    }),
    prisma.user.create({
      data: {
        email: 'yulia@demo.com', password: hash('password123'), name: 'Юлия Новикова', role: Role.TUTOR, avatar: 'ЮН',
        tutorProfile: { create: {
          bio: 'Историк с педагогическим образованием, 4 года преподавания. Занятия в формате дискуссий и разбора первоисточников. Помогу сдать ЕГЭ на 80+ баллов.',
          subjects: ['История', 'Обществознание', 'География'], hourlyRate: 1200, experience: 4,
          rating: 4.6, reviewCount: 19, status: TutorStatus.APPROVED,
          education: 'МПГУ, исторический факультет',
        }},
      },
    }),
  ]);

  const mariaTutor = mariaUser.tutorProfile!;
  const ivanTutor = ivanUser.tutorProfile!;
  const alexeiTutor = alexeiUser.tutorProfile!;

  // Criteria for Maria (English)
  const engCriteria = await Promise.all([
    prisma.competencyCriteria.create({ data: { tutorProfileId: mariaTutor.id, name: 'Грамматика', subject: 'Английский язык', description: 'Знание грамматических правил и их применение', orderIndex: 0 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: mariaTutor.id, name: 'Разговорная речь', subject: 'Английский язык', description: 'Способность вести беседу на иностранном языке', orderIndex: 1 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: mariaTutor.id, name: 'Аудирование', subject: 'Английский язык', description: 'Понимание устной речи носителей языка', orderIndex: 2 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: mariaTutor.id, name: 'Словарный запас', subject: 'Английский язык', description: 'Объём и разнообразие используемой лексики', orderIndex: 3 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: mariaTutor.id, name: 'Письмо', subject: 'Английский язык', description: 'Навыки письменного изложения мыслей', orderIndex: 4 } }),
  ]);

  // Criteria for Ivan (Math)
  const mathCriteria = await Promise.all([
    prisma.competencyCriteria.create({ data: { tutorProfileId: ivanTutor.id, name: 'Алгебра', subject: 'Математика', description: 'Работа с уравнениями и алгебраическими структурами', orderIndex: 0 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: ivanTutor.id, name: 'Геометрия', subject: 'Математика', description: 'Пространственное мышление и геометрические задачи', orderIndex: 1 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: ivanTutor.id, name: 'Математический анализ', subject: 'Математика', description: 'Пределы, производные, интегралы', orderIndex: 2 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: ivanTutor.id, name: 'Решение задач', subject: 'Математика', description: 'Способность решать нестандартные задачи', orderIndex: 3 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: ivanTutor.id, name: 'Теория', subject: 'Математика', description: 'Знание теоретических основ математики', orderIndex: 4 } }),
  ]);

  // Criteria for Alexei (Physics)
  const physCriteria = await Promise.all([
    prisma.competencyCriteria.create({ data: { tutorProfileId: alexeiTutor.id, name: 'Механика', subject: 'Физика', description: 'Законы движения и силы', orderIndex: 0 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: alexeiTutor.id, name: 'Электродинамика', subject: 'Физика', description: 'Электрические и магнитные явления', orderIndex: 1 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: alexeiTutor.id, name: 'Термодинамика', subject: 'Физика', description: 'Законы тепловых процессов', orderIndex: 2 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: alexeiTutor.id, name: 'Оптика', subject: 'Физика', description: 'Природа света и оптические явления', orderIndex: 3 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: alexeiTutor.id, name: 'Решение задач', subject: 'Физика', description: 'Применение физических законов к задачам', orderIndex: 4 } }),
  ]);

  // Students
  const annaUser = await prisma.user.create({
    data: {
      email: 'anna@demo.com',
      password: hash('password123'),
      name: 'Анна Волкова',
      role: Role.STUDENT,
      avatar: 'АВ',
      studentProfile: { create: { grade: '10 класс' } },
    },
    include: { studentProfile: true },
  });

  const dmitriUser = await prisma.user.create({
    data: {
      email: 'dmitri@demo.com',
      password: hash('password123'),
      name: 'Дмитрий Иванов',
      role: Role.STUDENT,
      avatar: 'ДИ',
      studentProfile: { create: { grade: '11 класс' } },
    },
    include: { studentProfile: true },
  });

  const ekaterina = await prisma.user.create({
    data: {
      email: 'ekaterina@demo.com',
      password: hash('password123'),
      name: 'Екатерина Чен',
      role: Role.STUDENT,
      avatar: 'ЕЧ',
      studentProfile: { create: { grade: '9 класс' } },
    },
    include: { studentProfile: true },
  });

  const anna = annaUser.studentProfile!;
  const dmitri = dmitriUser.studentProfile!;
  const kate = ekaterina.studentProfile!;

  // Anna — English with Maria (8 sessions, 56 days span)
  const annaSessionDays = [56, 48, 40, 32, 24, 16, 8, 1];
  const annaEngScores = [
    [3, 2, 4, 2, 2],
    [3, 3, 4, 3, 2],
    [4, 3, 5, 3, 3],
    [4, 4, 5, 4, 4],
    [5, 4, 6, 4, 4],
    [6, 5, 6, 5, 5],
    [6, 6, 7, 6, 6],
    [7, 7, 8, 7, 7],
  ];

  for (let i = 0; i < annaSessionDays.length; i++) {
    const session = await prisma.session.create({
      data: {
        tutorProfileId: mariaTutor.id,
        studentProfileId: anna.id,
        scheduledAt: daysAgo(annaSessionDays[i]),
        duration: 60,
        subject: 'Английский язык',
        status: SessionStatus.COMPLETED,
        notes: i === annaSessionDays.length - 1 ? 'Отличный прогресс! Продолжаем работу над произношением.' : null,
      },
    });
    for (let j = 0; j < engCriteria.length; j++) {
      await prisma.competencyScore.create({
        data: {
          studentProfileId: anna.id,
          criteriaId: engCriteria[j].id,
          sessionId: session.id,
          score: annaEngScores[i][j],
          scoredAt: daysAgo(annaSessionDays[i]),
        },
      });
    }
  }

  // Upcoming session for Anna
  const futureAnna = new Date();
  futureAnna.setDate(futureAnna.getDate() + 5);
  await prisma.session.create({
    data: {
      tutorProfileId: mariaTutor.id,
      studentProfileId: anna.id,
      scheduledAt: futureAnna,
      duration: 60,
      subject: 'Английский язык',
      status: SessionStatus.SCHEDULED,
    },
  });

  // Dmitri — Math with Ivan (8 sessions)
  const dmitriMathDays = [56, 48, 40, 32, 24, 16, 8, 1];
  const dmitriMathScores = [
    [3, 3, 2, 3, 4],
    [4, 3, 2, 3, 4],
    [4, 4, 3, 4, 5],
    [5, 4, 3, 4, 5],
    [5, 5, 4, 5, 6],
    [6, 5, 4, 6, 7],
    [7, 6, 5, 6, 7],
    [7, 7, 5, 7, 8],
  ];

  for (let i = 0; i < dmitriMathDays.length; i++) {
    const session = await prisma.session.create({
      data: {
        tutorProfileId: ivanTutor.id,
        studentProfileId: dmitri.id,
        scheduledAt: daysAgo(dmitriMathDays[i]),
        duration: 90,
        subject: 'Математика',
        status: SessionStatus.COMPLETED,
      },
    });
    for (let j = 0; j < mathCriteria.length; j++) {
      await prisma.competencyScore.create({
        data: {
          studentProfileId: dmitri.id,
          criteriaId: mathCriteria[j].id,
          sessionId: session.id,
          score: dmitriMathScores[i][j],
          scoredAt: daysAgo(dmitriMathDays[i]),
        },
      });
    }
  }

  // Dmitri — Physics with Alexei (8 sessions, different days)
  const dmitriPhysDays = [55, 47, 39, 31, 23, 15, 7, 2];
  const dmitriPhysScores = [
    [2, 2, 3, 2, 2],
    [3, 2, 3, 2, 3],
    [3, 3, 4, 3, 3],
    [4, 3, 4, 3, 4],
    [4, 3, 5, 4, 5],
    [5, 4, 5, 4, 6],
    [6, 4, 6, 5, 6],
    [6, 5, 6, 5, 7],
  ];

  for (let i = 0; i < dmitriPhysDays.length; i++) {
    const session = await prisma.session.create({
      data: {
        tutorProfileId: alexeiTutor.id,
        studentProfileId: dmitri.id,
        scheduledAt: daysAgo(dmitriPhysDays[i]),
        duration: 60,
        subject: 'Физика',
        status: SessionStatus.COMPLETED,
      },
    });
    for (let j = 0; j < physCriteria.length; j++) {
      await prisma.competencyScore.create({
        data: {
          studentProfileId: dmitri.id,
          criteriaId: physCriteria[j].id,
          sessionId: session.id,
          score: dmitriPhysScores[i][j],
          scoredAt: daysAgo(dmitriPhysDays[i]),
        },
      });
    }
  }

  // Upcoming for Dmitri
  const futureDmitri = new Date();
  futureDmitri.setDate(futureDmitri.getDate() + 3);
  await prisma.session.create({
    data: {
      tutorProfileId: ivanTutor.id,
      studentProfileId: dmitri.id,
      scheduledAt: futureDmitri,
      duration: 90,
      subject: 'Математика',
      status: SessionStatus.SCHEDULED,
    },
  });

  // Ekaterina — English with Maria (12 sessions, advanced)
  const kateDays = [84, 77, 70, 63, 56, 49, 42, 35, 28, 21, 14, 7];
  const kateScores = [
    [2, 2, 3, 2, 2],
    [3, 2, 3, 3, 2],
    [3, 3, 4, 3, 3],
    [4, 3, 4, 4, 3],
    [5, 4, 5, 4, 4],
    [5, 5, 6, 5, 5],
    [6, 5, 6, 5, 5],
    [6, 6, 7, 6, 6],
    [7, 7, 7, 7, 7],
    [7, 7, 8, 7, 7],
    [8, 8, 8, 8, 8],
    [9, 8, 9, 8, 8],
  ];

  for (let i = 0; i < kateDays.length; i++) {
    const session = await prisma.session.create({
      data: {
        tutorProfileId: mariaTutor.id,
        studentProfileId: kate.id,
        scheduledAt: daysAgo(kateDays[i]),
        duration: 60,
        subject: 'Английский язык',
        status: SessionStatus.COMPLETED,
        notes: i === kateDays.length - 1 ? 'Екатерина показывает выдающиеся результаты! Рекомендую IELTS.' : null,
      },
    });
    for (let j = 0; j < engCriteria.length; j++) {
      await prisma.competencyScore.create({
        data: {
          studentProfileId: kate.id,
          criteriaId: engCriteria[j].id,
          sessionId: session.id,
          score: kateScores[i][j],
          scoredAt: daysAgo(kateDays[i]),
        },
      });
    }
  }

  // Upcoming for Ekaterina
  const futureKate = new Date();
  futureKate.setDate(futureKate.getDate() + 7);
  await prisma.session.create({
    data: {
      tutorProfileId: mariaTutor.id,
      studentProfileId: kate.id,
      scheduledAt: futureKate,
      duration: 60,
      subject: 'Английский язык',
      status: SessionStatus.SCHEDULED,
    },
  });

  // Award achievements
  // Anna: 8 sessions, max score 8 (Listening) → Первый шаг, Прилежный ученик, На полпути, Уверенный прогресс
  await prisma.studentAchievement.createMany({
    data: [
      { studentProfileId: anna.id, achievementId: achFirst.id, earnedAt: daysAgo(56) },
      { studentProfileId: anna.id, achievementId: achDiligent.id, earnedAt: daysAgo(24) },
      { studentProfileId: anna.id, achievementId: achHalf.id, earnedAt: daysAgo(24) },
      { studentProfileId: anna.id, achievementId: achProgress.id, earnedAt: daysAgo(8) },
    ],
  });

  // Dmitri: 16 sessions (8 math + 8 physics), max score 8 (Math Theory) → all except Expert/Passion/Streak
  await prisma.studentAchievement.createMany({
    data: [
      { studentProfileId: dmitri.id, achievementId: achFirst.id, earnedAt: daysAgo(56) },
      { studentProfileId: dmitri.id, achievementId: achDiligent.id, earnedAt: daysAgo(23) },
      { studentProfileId: dmitri.id, achievementId: achConstant.id, earnedAt: daysAgo(7) },
      { studentProfileId: dmitri.id, achievementId: achHalf.id, earnedAt: daysAgo(24) },
      { studentProfileId: dmitri.id, achievementId: achProgress.id, earnedAt: daysAgo(8) },
      { studentProfileId: dmitri.id, achievementId: achPolyglot.id, earnedAt: daysAgo(55) },
    ],
  });

  // Ekaterina: 12 sessions, max score 9 → Первый шаг, Прилежный, Постоянный, На полпути, Уверенный, Почти эксперт
  await prisma.studentAchievement.createMany({
    data: [
      { studentProfileId: kate.id, achievementId: achFirst.id, earnedAt: daysAgo(84) },
      { studentProfileId: kate.id, achievementId: achDiligent.id, earnedAt: daysAgo(56) },
      { studentProfileId: kate.id, achievementId: achConstant.id, earnedAt: daysAgo(21) },
      { studentProfileId: kate.id, achievementId: achHalf.id, earnedAt: daysAgo(56) },
      { studentProfileId: kate.id, achievementId: achProgress.id, earnedAt: daysAgo(35) },
      { studentProfileId: kate.id, achievementId: achExpert.id, earnedAt: daysAgo(7) },
      { studentProfileId: kate.id, achievementId: achStreak.id, earnedAt: daysAgo(28) },
    ],
  });

  // Sample reviews for Maria and Ivan
  await prisma.review.createMany({
    data: [
      { tutorProfileId: mariaTutor.id, studentProfileId: anna.id, rating: 5, text: 'Мария — замечательный педагог! Объясняет понятно, всегда находит индивидуальный подход. За несколько месяцев мой уровень вырос значительно.', createdAt: daysAgo(8) },
      { tutorProfileId: mariaTutor.id, studentProfileId: kate.id, rating: 5, text: 'Лучший репетитор по английскому! Занимаемся уже 3 месяца, прогресс очевидный. Рекомендую всем, кто хочет быстро улучшить язык.', createdAt: daysAgo(7) },
      { tutorProfileId: ivanTutor.id, studentProfileId: dmitri.id, rating: 5, text: 'Иван Сергеевич — математик от бога. Объясняет каждую тему так, что даже сложные разделы становятся понятными. Готовлюсь к ЕГЭ — доволен на 100%.', createdAt: daysAgo(1) },
    ],
  });

  console.log('✅ Database seeded successfully!');
  console.log('\nDemo accounts:');
  console.log('  Admin:    admin@demo.com / admin123');
  console.log('  Students: anna@demo.com, dmitri@demo.com, ekaterina@demo.com  (password123)');
  console.log('  Tutors:   maria@demo.com, ivan@demo.com, alexei@demo.com, olga@demo.com, sergei@demo.com, anastasia@demo.com, timur@demo.com, yulia@demo.com  (password123)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
