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
  if (existing > 0) { console.log('Database already seeded, skipping...'); return; }

  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  // ── Admin ─────────────────────────────────────────────────────────────────
  await prisma.user.create({
    data: { email: 'admin@demo.com', password: hash('admin123'), name: 'Администратор', role: Role.ADMIN, avatar: 'AD' },
  });

  // ── Achievements ──────────────────────────────────────────────────────────
  const achievements = await Promise.all([
    prisma.achievement.create({ data: { name: 'Первый шаг',         description: 'Первое занятие пройдено!',                icon: '🌱', type: AchievementType.ATTENDANCE,      sessionsRequired: 1  } }),
    prisma.achievement.create({ data: { name: 'На полпути',         description: 'Компетенция достигла уровня 5/10',        icon: '🎯', type: AchievementType.SCORE_MILESTONE, threshold: 5         } }),
    prisma.achievement.create({ data: { name: 'Уверенный прогресс', description: 'Компетенция достигла уровня 7/10',        icon: '🚀', type: AchievementType.SCORE_MILESTONE, threshold: 7         } }),
    prisma.achievement.create({ data: { name: 'Почти эксперт',      description: 'Компетенция достигла уровня 9/10',        icon: '⭐', type: AchievementType.SCORE_MILESTONE, threshold: 9         } }),
    prisma.achievement.create({ data: { name: 'Эксперт!',           description: 'Достигнут максимальный уровень 10/10',    icon: '👑', type: AchievementType.SCORE_MILESTONE, threshold: 10        } }),
    prisma.achievement.create({ data: { name: 'Прилежный ученик',   description: '5 занятий пройдено',                      icon: '📚', type: AchievementType.ATTENDANCE,      sessionsRequired: 5  } }),
    prisma.achievement.create({ data: { name: 'Постоянный студент', description: '10 занятий пройдено',                     icon: '🏆', type: AchievementType.ATTENDANCE,      sessionsRequired: 10 } }),
    prisma.achievement.create({ data: { name: 'Страсть к знаниям',  description: '20 занятий пройдено',                     icon: '💫', type: AchievementType.ATTENDANCE,      sessionsRequired: 20 } }),
    prisma.achievement.create({ data: { name: 'Полиглот',           description: 'Занятия по 2 или более предметам',        icon: '🌍', type: AchievementType.SPECIAL                             } }),
    prisma.achievement.create({ data: { name: 'Три в ряд',          description: '3 занятия на одной неделе',               icon: '🔥', type: AchievementType.STREAK                               } }),
  ]);
  const [achFirst, achHalf, achProgress, achExpert, , achDiligent, achConstant, achPassion, achPolyglot, achStreak] = achievements;

  // ── Tutors  (XP thresholds: [0,400,2000,5500,12000] → Старт/Активный/Надёжный/Признанный/Элитный)
  const mariaUser = await prisma.user.create({
    data: {
      email: 'maria@demo.com', password: hash('password123'), name: 'Мария Петрова',
      role: Role.TUTOR, avatar: 'МП', xp: 6200,  // 🎖️ Признанный
      tutorProfile: { create: {
        bio: 'Преподаю английский язык более 8 лет. Специализируюсь на разговорной речи и подготовке к международным экзаменам (IELTS, TOEFL). Мои ученики успешно сдают экзамены и свободно общаются на английском.',
        subjects: ['Английский язык', 'Французский язык'], hourlyRate: 1500, experience: 8,
        rating: 4.9, reviewCount: 47, status: TutorStatus.APPROVED, education: 'МГУ, факультет иностранных языков',
      }},
    },
    include: { tutorProfile: true },
  });

  const ivanUser = await prisma.user.create({
    data: {
      email: 'ivan@demo.com', password: hash('password123'), name: 'Иван Кузнецов',
      role: Role.TUTOR, avatar: 'ИК', xp: 8400,  // 🎖️ Признанный
      tutorProfile: { create: {
        bio: 'Кандидат физико-математических наук, доцент. Преподаю математику для школьников и студентов уже 12 лет. Подготовка к ЕГЭ/ОГЭ с гарантированным результатом.',
        subjects: ['Математика', 'Алгебра', 'Геометрия'], hourlyRate: 1800, experience: 12,
        rating: 4.8, reviewCount: 63, status: TutorStatus.APPROVED, education: 'МГУ, механико-математический факультет, к.ф.-м.н.',
      }},
    },
    include: { tutorProfile: true },
  });

  const alexeiUser = await prisma.user.create({
    data: {
      email: 'alexei@demo.com', password: hash('password123'), name: 'Алексей Смирнов',
      role: Role.TUTOR, avatar: 'АС', xp: 2800,  // 🏅 Надёжный
      tutorProfile: { create: {
        bio: 'Физик-экспериментатор с опытом преподавания 6 лет. Объясняю сложные концепции простым языком. Специализируюсь на подготовке к олимпиадам и ЕГЭ по физике.',
        subjects: ['Физика', 'Химия'], hourlyRate: 1700, experience: 6,
        rating: 4.7, reviewCount: 31, status: TutorStatus.APPROVED, education: 'МФТИ, факультет общей и прикладной физики',
      }},
    },
    include: { tutorProfile: true },
  });

  const olgaUser = await prisma.user.create({
    data: {
      email: 'olga@demo.com', password: hash('password123'), name: 'Ольга Белова',
      role: Role.TUTOR, avatar: 'ОБ', xp: 7100,  // 🎖️ Признанный
      tutorProfile: { create: {
        bio: 'Преподаю русский язык и литературу 9 лет. Авторская методика подготовки к сочинению ЕГЭ — ученики стабильно набирают 85+ баллов. Работаю со всеми классами.',
        subjects: ['Русский язык', 'Литература'], hourlyRate: 1400, experience: 9,
        rating: 4.8, reviewCount: 56, status: TutorStatus.APPROVED, education: 'МГУ, факультет филологии',
      }},
    },
    include: { tutorProfile: true },
  });

  const sergeiUser = await prisma.user.create({
    data: {
      email: 'sergei@demo.com', password: hash('password123'), name: 'Сергей Громов',
      role: Role.TUTOR, avatar: 'СГ', xp: 3200,  // 🏅 Надёжный
      tutorProfile: { create: {
        bio: 'Разработчик с 10 годами опыта, преподаю информатику и программирование 5 лет. Python, алгоритмы, подготовка к ЕГЭ и олимпиадам по информатике.',
        subjects: ['Информатика'], hourlyRate: 2200, experience: 5,
        rating: 4.9, reviewCount: 28, status: TutorStatus.APPROVED, education: 'МФТИ, факультет прикладной математики и информатики',
      }},
    },
    include: { tutorProfile: true },
  });

  const anastasiaUser = await prisma.user.create({
    data: {
      email: 'anastasia@demo.com', password: hash('password123'), name: 'Анастасия Лебедева',
      role: Role.TUTOR, avatar: 'АЛ', xp: 2400,  // 🏅 Надёжный
      tutorProfile: { create: {
        bio: 'Биолог и химик с 6-летним опытом преподавания. Объясняю сложные темы простым языком. Специализируюсь на подготовке к ОГЭ и ЕГЭ.',
        subjects: ['Биология', 'Химия'], hourlyRate: 1350, experience: 6,
        rating: 4.7, reviewCount: 33, status: TutorStatus.APPROVED, education: 'Первый МГМУ им. Сеченова, биохимический факультет',
      }},
    },
    include: { tutorProfile: true },
  });

  const timurUser = await prisma.user.create({
    data: {
      email: 'timur@demo.com', password: hash('password123'), name: 'Тимур Ахметов',
      role: Role.TUTOR, avatar: 'ТА', xp: 4800,  // 🏅 Надёжный
      tutorProfile: { create: {
        bio: 'Сертифицированный преподаватель английского (CELTA). Коммуникативная методика, бизнес-английский, подготовка к IELTS и Cambridge. Провёл 3 года в Лондоне.',
        subjects: ['Английский язык'], hourlyRate: 1900, experience: 7,
        rating: 4.8, reviewCount: 44, status: TutorStatus.APPROVED, education: 'МГЛУ, факультет английского языка; CELTA Cambridge',
      }},
    },
    include: { tutorProfile: true },
  });

  const yuliaUser = await prisma.user.create({
    data: {
      email: 'yulia@demo.com', password: hash('password123'), name: 'Юлия Новикова',
      role: Role.TUTOR, avatar: 'ЮН', xp: 850,   // Активный
      tutorProfile: { create: {
        bio: 'Историк с педагогическим образованием, 4 года преподавания. Занятия в формате дискуссий и разбора первоисточников. Помогу сдать ЕГЭ на 80+ баллов.',
        subjects: ['История', 'Обществознание', 'География'], hourlyRate: 1200, experience: 4,
        rating: 4.6, reviewCount: 19, status: TutorStatus.APPROVED, education: 'МПГУ, исторический факультет',
      }},
    },
    include: { tutorProfile: true },
  });

  const mariaTutor   = mariaUser.tutorProfile!;
  const ivanTutor    = ivanUser.tutorProfile!;
  const alexeiTutor  = alexeiUser.tutorProfile!;
  const olgaTutor    = olgaUser.tutorProfile!;
  const sergeiTutor  = sergeiUser.tutorProfile!;
  const anastaTutor  = anastasiaUser.tutorProfile!;
  const timurTutor   = timurUser.tutorProfile!;
  const yuliaTutor   = yuliaUser.tutorProfile!;

  // ── Admin requests ────────────────────────────────────────────────────────
  await prisma.subjectRequest.createMany({
    data: [
      { tutorProfileId: timurTutor.id,  subject: 'Немецкий язык', justification: 'Имею диплом переводчика немецкого языка (МГЛУ, 2017). Готов предоставить документы.', status: 'PENDING', createdAt: daysAgo(3) },
      { tutorProfileId: anastaTutor.id, subject: 'Анатомия', justification: 'Прошла курс медицинской анатомии в МГМУ, помогаю студентам-медикам готовиться к экзаменам.', status: 'PENDING', createdAt: daysAgo(7) },
      { tutorProfileId: yuliaTutor.id,  subject: 'Право', justification: 'Параллельно получаю юридическое образование, готова вести занятия по основам права для ЕГЭ.', status: 'APPROVED', adminNote: 'Одобрено, предметы расширены.', createdAt: daysAgo(30), reviewedAt: daysAgo(28) },
    ],
  });
  await prisma.profileChangeRequest.createMany({
    data: [
      { tutorProfileId: alexeiTutor.id, bio: 'Физик-экспериментатор, к.ф.-м.н., опыт преподавания 7 лет. Веду занятия по физике и химии для 8–11 классов. Авторская программа подготовки к ЕГЭ по физике.', experience: 7, status: 'PENDING', createdAt: daysAgo(2) },
      { tutorProfileId: yuliaTutor.id,  education: 'МПГУ, исторический факультет; РАНХиГС, юридический факультет (заочно)', status: 'PENDING', createdAt: daysAgo(5) },
    ],
  });

  // ── Competency criteria ───────────────────────────────────────────────────

  const engCriteria = await Promise.all([
    prisma.competencyCriteria.create({ data: { tutorProfileId: mariaTutor.id, name: 'Грамматика',       subject: 'Английский язык', orderIndex: 0 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: mariaTutor.id, name: 'Разговорная речь', subject: 'Английский язык', orderIndex: 1 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: mariaTutor.id, name: 'Аудирование',      subject: 'Английский язык', orderIndex: 2 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: mariaTutor.id, name: 'Словарный запас',  subject: 'Английский язык', orderIndex: 3 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: mariaTutor.id, name: 'Письмо',           subject: 'Английский язык', orderIndex: 4 } }),
  ]);

  const mathCriteria = await Promise.all([
    prisma.competencyCriteria.create({ data: { tutorProfileId: ivanTutor.id, name: 'Алгебра',               subject: 'Математика', orderIndex: 0 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: ivanTutor.id, name: 'Геометрия',             subject: 'Математика', orderIndex: 1 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: ivanTutor.id, name: 'Математический анализ', subject: 'Математика', orderIndex: 2 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: ivanTutor.id, name: 'Решение задач',         subject: 'Математика', orderIndex: 3 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: ivanTutor.id, name: 'Теория',                subject: 'Математика', orderIndex: 4 } }),
  ]);

  const physCriteria = await Promise.all([
    prisma.competencyCriteria.create({ data: { tutorProfileId: alexeiTutor.id, name: 'Механика',        subject: 'Физика', orderIndex: 0 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: alexeiTutor.id, name: 'Электродинамика', subject: 'Физика', orderIndex: 1 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: alexeiTutor.id, name: 'Термодинамика',   subject: 'Физика', orderIndex: 2 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: alexeiTutor.id, name: 'Оптика',          subject: 'Физика', orderIndex: 3 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: alexeiTutor.id, name: 'Решение задач',   subject: 'Физика', orderIndex: 4 } }),
  ]);

  const rusCriteria = await Promise.all([
    prisma.competencyCriteria.create({ data: { tutorProfileId: olgaTutor.id, name: 'Грамматика',   subject: 'Русский язык', orderIndex: 0 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: olgaTutor.id, name: 'Орфография',   subject: 'Русский язык', orderIndex: 1 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: olgaTutor.id, name: 'Пунктуация',   subject: 'Русский язык', orderIndex: 2 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: olgaTutor.id, name: 'Изложение',    subject: 'Русский язык', orderIndex: 3 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: olgaTutor.id, name: 'Сочинение',    subject: 'Русский язык', orderIndex: 4 } }),
  ]);

  const infCriteria = await Promise.all([
    prisma.competencyCriteria.create({ data: { tutorProfileId: sergeiTutor.id, name: 'Алгоритмы',         subject: 'Информатика', orderIndex: 0 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: sergeiTutor.id, name: 'Программирование',  subject: 'Информатика', orderIndex: 1 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: sergeiTutor.id, name: 'Структуры данных',  subject: 'Информатика', orderIndex: 2 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: sergeiTutor.id, name: 'Математическая логика', subject: 'Информатика', orderIndex: 3 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: sergeiTutor.id, name: 'Практика',          subject: 'Информатика', orderIndex: 4 } }),
  ]);

  const bioCriteria = await Promise.all([
    prisma.competencyCriteria.create({ data: { tutorProfileId: anastaTutor.id, name: 'Клеточная биология', subject: 'Биология', orderIndex: 0 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: anastaTutor.id, name: 'Генетика',           subject: 'Биология', orderIndex: 1 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: anastaTutor.id, name: 'Экология',           subject: 'Биология', orderIndex: 2 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: anastaTutor.id, name: 'Анатомия',           subject: 'Биология', orderIndex: 3 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: anastaTutor.id, name: 'Систематика',        subject: 'Биология', orderIndex: 4 } }),
  ]);

  const engTimCriteria = await Promise.all([
    prisma.competencyCriteria.create({ data: { tutorProfileId: timurTutor.id, name: 'Грамматика', subject: 'Английский язык', orderIndex: 0 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: timurTutor.id, name: 'Говорение',  subject: 'Английский язык', orderIndex: 1 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: timurTutor.id, name: 'Аудирование',subject: 'Английский язык', orderIndex: 2 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: timurTutor.id, name: 'Лексика',    subject: 'Английский язык', orderIndex: 3 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: timurTutor.id, name: 'Письмо',     subject: 'Английский язык', orderIndex: 4 } }),
  ]);

  const hisCriteria = await Promise.all([
    prisma.competencyCriteria.create({ data: { tutorProfileId: yuliaTutor.id, name: 'Хронология',                    subject: 'История', orderIndex: 0 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: yuliaTutor.id, name: 'Исторические личности',         subject: 'История', orderIndex: 1 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: yuliaTutor.id, name: 'Причинно-следственные связи',   subject: 'История', orderIndex: 2 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: yuliaTutor.id, name: 'Работа с источниками',          subject: 'История', orderIndex: 3 } }),
    prisma.competencyCriteria.create({ data: { tutorProfileId: yuliaTutor.id, name: 'Даты и события',               subject: 'История', orderIndex: 4 } }),
  ]);

  // ── Helper to create session + scores ────────────────────────────────────
  async function createSession(
    tutorId: string, studentId: string, day: number,
    subject: string, duration: number, criteria: { id: string }[], scores: number[], note?: string,
  ) {
    const session = await prisma.session.create({
      data: { tutorProfileId: tutorId, studentProfileId: studentId, scheduledAt: daysAgo(day), duration, subject, status: SessionStatus.COMPLETED, notes: note ?? null },
    });
    await Promise.all(criteria.map((c, j) =>
      prisma.competencyScore.create({ data: { studentProfileId: studentId, criteriaId: c.id, sessionId: session.id, score: scores[j], scoredAt: daysAgo(day) } }),
    ));
    return session;
  }

  // ── Students ──────────────────────────────────────────────────────────────

  const annaUser = await prisma.user.create({
    data: { email: 'anna@demo.com', password: hash('password123'), name: 'Анна Волкова', role: Role.STUDENT, avatar: 'АВ', xp: 680, level: 4, studentProfile: { create: { grade: '10 класс' } } },
    include: { studentProfile: true },
  });
  const dmitriUser = await prisma.user.create({
    data: { email: 'dmitri@demo.com', password: hash('password123'), name: 'Дмитрий Иванов', role: Role.STUDENT, avatar: 'ДИ', xp: 1050, level: 5, studentProfile: { create: { grade: '11 класс' } } },
    include: { studentProfile: true },
  });
  const ekaterina = await prisma.user.create({
    data: { email: 'ekaterina@demo.com', password: hash('password123'), name: 'Екатерина Чен', role: Role.STUDENT, avatar: 'ЕЧ', studentProfile: { create: { grade: '9 класс' } } },
    include: { studentProfile: true },
  });
  // Максим: информатика + русский, ~18 занятий → XP 380 → level 3
  const maksimUser = await prisma.user.create({
    data: { email: 'maksim@demo.com', password: hash('password123'), name: 'Максим Орлов', role: Role.STUDENT, avatar: 'МО', xp: 380, level: 3, studentProfile: { create: { grade: '9 класс' } } },
    include: { studentProfile: true },
  });
  // Арина: биология, ~9 занятий → XP 210 → level 3
  const arinaUser = await prisma.user.create({
    data: { email: 'arina@demo.com', password: hash('password123'), name: 'Арина Соколова', role: Role.STUDENT, avatar: 'АС', xp: 210, level: 3, studentProfile: { create: { grade: '8 класс' } } },
    include: { studentProfile: true },
  });
  // Кирилл: английский + история, ~14 занятий → XP 300 → level 3
  const kirillUser = await prisma.user.create({
    data: { email: 'kirill@demo.com', password: hash('password123'), name: 'Кирилл Фёдоров', role: Role.STUDENT, avatar: 'КФ', xp: 300, level: 3, studentProfile: { create: { grade: '11 класс' } } },
    include: { studentProfile: true },
  });

  const anna   = annaUser.studentProfile!;
  const dmitri = dmitriUser.studentProfile!;
  const kate   = ekaterina.studentProfile!;
  const maksim = maksimUser.studentProfile!;
  const arina  = arinaUser.studentProfile!;
  const kirill = kirillUser.studentProfile!;

  // ── Anna — English / Maria (26 sessions, 6 months) ───────────────────────
  // Week radar: day 2 [9,8,9,8,8] vs day 9 [8,7,8,7,7]   ∆ = +1 each
  // Month radar: day 2 [9,8,9,8,8] vs day 33 [6,6,7,6,6]  ∆ = +2–3
  {
    const days   = [180,173,166,159,152,145,138,131,124,117,110,103,96,89,82,75,68,61,54,47,40,33,19,12,9,2];
    const scores = [
      [2,2,3,2,2],[2,2,3,2,2],[2,2,3,2,2],[3,2,3,2,2],[3,3,3,3,2],
      [3,3,4,3,2],[3,3,4,3,3],[3,3,4,3,3],[4,3,4,3,3],[4,3,4,4,3],
      [4,4,5,4,4],[4,4,5,4,4],[5,4,5,4,4],[5,4,5,4,4],[5,5,6,5,4],
      [5,5,6,5,5],[5,5,6,5,5],[5,5,6,5,5],[6,5,6,5,5],[6,6,7,6,5],
      [6,6,7,6,6],[6,6,7,6,6],[7,7,7,7,6],[7,7,8,7,7],[8,7,8,7,7],
      [9,8,9,8,8],
    ];
    for (let i = 0; i < days.length; i++)
      await createSession(mariaTutor.id, anna.id, days[i], 'Английский язык', 60, engCriteria, scores[i],
        i === days.length - 1 ? 'Отличный прогресс! Продолжаем работу над произношением.' : undefined);
    const d = new Date(); d.setDate(d.getDate() + 5);
    await prisma.session.create({ data: { tutorProfileId: mariaTutor.id, studentProfileId: anna.id, scheduledAt: d, duration: 60, subject: 'Английский язык', status: SessionStatus.SCHEDULED } });
  }

  // ── Dmitri — Math / Ivan (26 sessions) ───────────────────────────────────
  // Week radar: day 1 [9,8,8,9,9] vs day 8 [8,7,7,8,9]   ∆ = +1/+1/+1/+1
  // Month radar: day 1 [9,8,8,9,9] vs day 33 [7,7,6,7,8]  ∆ = +2/+1/+2/+2
  {
    const days   = [180,173,166,159,152,145,138,131,124,117,110,103,96,89,82,75,68,61,54,47,40,33,22,15,8,1];
    const scores = [
      [2,3,1,2,3],[2,3,1,2,3],[3,3,2,2,3],[3,3,2,3,4],[3,4,2,3,4],
      [4,4,2,3,4],[4,4,3,3,5],[4,4,3,4,5],[4,4,3,4,5],[5,4,3,4,5],
      [5,5,3,4,6],[5,5,4,5,6],[5,5,4,5,6],[6,5,4,5,6],[6,5,4,5,7],
      [6,6,5,6,7],[6,6,5,6,7],[6,6,5,6,7],[7,6,5,6,7],[7,6,5,7,8],
      [7,7,6,7,8],[7,7,6,7,8],[8,7,6,7,8],[8,7,6,8,8],[8,7,7,8,9],
      [9,8,8,9,9],
    ];
    for (let i = 0; i < days.length; i++)
      await createSession(ivanTutor.id, dmitri.id, days[i], 'Математика', 90, mathCriteria, scores[i]);
  }

  // ── Dmitri — Physics / Alexei (20 sessions) ──────────────────────────────
  // Week radar: day 3 [8,7,8,7,8] vs day 10 [7,6,7,6,7]  ∆ = +1 each
  // Month radar: day 3 [8,7,8,7,8] vs day 38 [6,5,6,5,6]  ∆ = +2 each
  {
    const days   = [179,171,163,155,147,139,131,123,115,107,99,91,83,75,67,59,38,20,10,3];
    const scores = [
      [2,1,2,2,2],[2,2,2,2,2],[3,2,2,2,2],[3,2,3,2,3],[3,2,3,3,3],
      [3,3,3,3,3],[4,3,4,3,3],[4,3,4,3,4],[4,3,4,4,4],[4,4,4,4,4],
      [5,4,5,4,5],[5,4,5,4,5],[5,4,5,5,5],[5,5,5,5,5],[6,5,6,5,6],
      [6,5,6,5,6],[6,5,6,5,6],[7,6,6,6,7],[7,6,7,6,7],[8,7,8,7,8],
    ];
    for (let i = 0; i < days.length; i++)
      await createSession(alexeiTutor.id, dmitri.id, days[i], 'Физика', 60, physCriteria, scores[i]);
    const d = new Date(); d.setDate(d.getDate() + 3);
    await prisma.session.create({ data: { tutorProfileId: ivanTutor.id, studentProfileId: dmitri.id, scheduledAt: d, duration: 90, subject: 'Математика', status: SessionStatus.SCHEDULED } });
  }

  // ── Ekaterina — English / Maria (12 sessions) ────────────────────────────
  {
    const days   = [84,77,70,63,56,49,42,35,28,21,14,7];
    const scores = [
      [2,2,3,2,2],[3,2,3,3,2],[3,3,4,3,3],[4,3,4,4,3],
      [5,4,5,4,4],[5,5,6,5,5],[6,5,6,5,5],[6,6,7,6,6],
      [7,7,7,7,7],[7,7,8,7,7],[8,8,8,8,8],[9,8,9,8,8],
    ];
    for (let i = 0; i < days.length; i++)
      await createSession(mariaTutor.id, kate.id, days[i], 'Английский язык', 60, engCriteria, scores[i],
        i === days.length - 1 ? 'Екатерина показывает выдающиеся результаты! Рекомендую IELTS.' : undefined);
    const d = new Date(); d.setDate(d.getDate() + 7);
    await prisma.session.create({ data: { tutorProfileId: mariaTutor.id, studentProfileId: kate.id, scheduledAt: d, duration: 60, subject: 'Английский язык', status: SessionStatus.SCHEDULED } });
  }

  // ── Максим — Информатика / Сергей (10 sessions) ───────────────────────────
  // [Алгоритмы, Программирование, Структуры данных, Матлогика, Практика]
  {
    const days   = [70,63,56,49,42,35,28,21,14,7];
    const scores = [
      [3,4,3,3,3],[3,4,3,3,4],[4,4,4,3,4],[4,5,4,4,4],[5,5,4,4,5],
      [5,5,5,5,5],[5,6,5,5,5],[6,6,6,5,6],[6,7,6,6,6],[7,7,7,6,7],
    ];
    for (let i = 0; i < days.length; i++)
      await createSession(sergeiTutor.id, maksim.id, days[i], 'Информатика', 60, infCriteria, scores[i],
        i === days.length - 1 ? 'Максим хорошо освоил Python, переходим к алгоритмам сортировки.' : undefined);
    const d = new Date(); d.setDate(d.getDate() + 4);
    await prisma.session.create({ data: { tutorProfileId: sergeiTutor.id, studentProfileId: maksim.id, scheduledAt: d, duration: 60, subject: 'Информатика', status: SessionStatus.SCHEDULED } });
  }

  // ── Максим — Русский язык / Ольга (8 sessions) ───────────────────────────
  // [Грамматика, Орфография, Пунктуация, Изложение, Сочинение]
  {
    const days   = [68,61,54,47,40,33,20,9];
    const scores = [
      [3,3,3,2,2],[3,3,3,3,2],[4,3,4,3,3],[4,4,4,3,3],
      [5,4,5,4,3],[5,5,5,4,4],[6,5,5,5,5],[6,6,6,5,5],
    ];
    for (let i = 0; i < days.length; i++)
      await createSession(olgaTutor.id, maksim.id, days[i], 'Русский язык', 60, rusCriteria, scores[i]);
  }

  // ── Арина — Биология / Анастасия (9 sessions) ────────────────────────────
  // [Клеточная биология, Генетика, Экология, Анатомия, Систематика]
  {
    const days   = [63,56,49,42,35,28,21,12,5];
    const scores = [
      [2,2,3,2,2],[3,2,3,2,2],[3,3,3,3,3],[4,3,4,3,3],
      [4,4,4,3,4],[5,4,5,4,4],[5,4,5,4,5],[5,5,5,5,5],[6,5,6,5,6],
    ];
    for (let i = 0; i < days.length; i++)
      await createSession(anastaTutor.id, arina.id, days[i], 'Биология', 60, bioCriteria, scores[i],
        i === days.length - 1 ? 'Арина хорошо разбирается в генетике, нужно подтянуть систематику.' : undefined);
    const d = new Date(); d.setDate(d.getDate() + 6);
    await prisma.session.create({ data: { tutorProfileId: anastaTutor.id, studentProfileId: arina.id, scheduledAt: d, duration: 60, subject: 'Биология', status: SessionStatus.SCHEDULED } });
  }

  // ── Кирилл — Английский / Тимур (8 sessions) ─────────────────────────────
  // [Грамматика, Говорение, Аудирование, Лексика, Письмо]
  {
    const days   = [56,49,42,35,28,21,14,6];
    const scores = [
      [4,3,4,4,3],[4,4,4,4,3],[5,4,5,5,4],[5,5,5,5,4],
      [6,5,6,5,5],[6,6,6,6,5],[7,6,7,6,6],[7,7,7,7,6],
    ];
    for (let i = 0; i < days.length; i++)
      await createSession(timurTutor.id, kirill.id, days[i], 'Английский язык', 60, engTimCriteria, scores[i],
        i === days.length - 1 ? 'Отличная динамика! Кирилл готов к разговорной практике на уровне B2.' : undefined);
  }

  // ── Кирилл — История / Юлия (6 sessions) ─────────────────────────────────
  // [Хронология, Ист. личности, Причинно-следств. связи, Источники, Даты]
  {
    const days   = [55,48,40,32,22,10];
    const scores = [
      [3,3,2,3,3],[4,3,3,3,4],[4,4,3,4,4],[5,4,4,4,5],[5,5,4,5,5],[6,5,5,5,6],
    ];
    for (let i = 0; i < days.length; i++)
      await createSession(yuliaTutor.id, kirill.id, days[i], 'История', 60, hisCriteria, scores[i]);
    const d = new Date(); d.setDate(d.getDate() + 5);
    await prisma.session.create({ data: { tutorProfileId: yuliaTutor.id, studentProfileId: kirill.id, scheduledAt: d, duration: 60, subject: 'История', status: SessionStatus.SCHEDULED } });
  }

  // ── Achievements ──────────────────────────────────────────────────────────

  await prisma.studentAchievement.createMany({ data: [
    { studentProfileId: anna.id, achievementId: achFirst.id,    earnedAt: daysAgo(180) },
    { studentProfileId: anna.id, achievementId: achDiligent.id, earnedAt: daysAgo(152) },
    { studentProfileId: anna.id, achievementId: achHalf.id,     earnedAt: daysAgo(110) },
    { studentProfileId: anna.id, achievementId: achConstant.id, earnedAt: daysAgo(110) },
    { studentProfileId: anna.id, achievementId: achPassion.id,  earnedAt: daysAgo(47)  },
    { studentProfileId: anna.id, achievementId: achProgress.id, earnedAt: daysAgo(47)  },
    { studentProfileId: anna.id, achievementId: achStreak.id,   earnedAt: daysAgo(12)  },
    { studentProfileId: anna.id, achievementId: achExpert.id,   earnedAt: daysAgo(2)   },
  ]});

  await prisma.studentAchievement.createMany({ data: [
    { studentProfileId: dmitri.id, achievementId: achFirst.id,    earnedAt: daysAgo(180) },
    { studentProfileId: dmitri.id, achievementId: achPolyglot.id, earnedAt: daysAgo(179) },
    { studentProfileId: dmitri.id, achievementId: achDiligent.id, earnedAt: daysAgo(152) },
    { studentProfileId: dmitri.id, achievementId: achConstant.id, earnedAt: daysAgo(110) },
    { studentProfileId: dmitri.id, achievementId: achHalf.id,     earnedAt: daysAgo(99)  },
    { studentProfileId: dmitri.id, achievementId: achPassion.id,  earnedAt: daysAgo(47)  },
    { studentProfileId: dmitri.id, achievementId: achProgress.id, earnedAt: daysAgo(54)  },
    { studentProfileId: dmitri.id, achievementId: achStreak.id,   earnedAt: daysAgo(20)  },
    { studentProfileId: dmitri.id, achievementId: achExpert.id,   earnedAt: daysAgo(8)   },
  ]});

  await prisma.studentAchievement.createMany({ data: [
    { studentProfileId: kate.id, achievementId: achFirst.id,    earnedAt: daysAgo(84) },
    { studentProfileId: kate.id, achievementId: achDiligent.id, earnedAt: daysAgo(56) },
    { studentProfileId: kate.id, achievementId: achHalf.id,     earnedAt: daysAgo(56) },
    { studentProfileId: kate.id, achievementId: achConstant.id, earnedAt: daysAgo(21) },
    { studentProfileId: kate.id, achievementId: achProgress.id, earnedAt: daysAgo(35) },
    { studentProfileId: kate.id, achievementId: achExpert.id,   earnedAt: daysAgo(7)  },
    { studentProfileId: kate.id, achievementId: achStreak.id,   earnedAt: daysAgo(28) },
  ]});

  // Максим: 10 информатика + 8 русский = 18 занятий, 2 предмета, max score 7
  await prisma.studentAchievement.createMany({ data: [
    { studentProfileId: maksim.id, achievementId: achFirst.id,    earnedAt: daysAgo(70) },
    { studentProfileId: maksim.id, achievementId: achPolyglot.id, earnedAt: daysAgo(68) },
    { studentProfileId: maksim.id, achievementId: achDiligent.id, earnedAt: daysAgo(42) },
    { studentProfileId: maksim.id, achievementId: achHalf.id,     earnedAt: daysAgo(35) },
    { studentProfileId: maksim.id, achievementId: achConstant.id, earnedAt: daysAgo(28) },
    { studentProfileId: maksim.id, achievementId: achProgress.id, earnedAt: daysAgo(7)  },
  ]});

  // Арина: 9 занятий, max score 6
  await prisma.studentAchievement.createMany({ data: [
    { studentProfileId: arina.id, achievementId: achFirst.id,    earnedAt: daysAgo(63) },
    { studentProfileId: arina.id, achievementId: achDiligent.id, earnedAt: daysAgo(35) },
    { studentProfileId: arina.id, achievementId: achHalf.id,     earnedAt: daysAgo(28) },
  ]});

  // Кирилл: 8 английский + 6 история = 14 занятий, 2 предмета, max score 7
  await prisma.studentAchievement.createMany({ data: [
    { studentProfileId: kirill.id, achievementId: achFirst.id,    earnedAt: daysAgo(56) },
    { studentProfileId: kirill.id, achievementId: achPolyglot.id, earnedAt: daysAgo(55) },
    { studentProfileId: kirill.id, achievementId: achDiligent.id, earnedAt: daysAgo(28) },
    { studentProfileId: kirill.id, achievementId: achHalf.id,     earnedAt: daysAgo(28) },
    { studentProfileId: kirill.id, achievementId: achConstant.id, earnedAt: daysAgo(14) },
    { studentProfileId: kirill.id, achievementId: achProgress.id, earnedAt: daysAgo(6)  },
    { studentProfileId: kirill.id, achievementId: achStreak.id,   earnedAt: daysAgo(10) },
  ]});

  // ── Reviews (почти все репетиторы, 5★ и редко 4★) ────────────────────────
  await prisma.review.createMany({ data: [
    // Maria — уже 2 студента
    { tutorProfileId: mariaTutor.id,  studentProfileId: anna.id,   rating: 5, text: 'Мария — замечательный педагог! Объясняет понятно, всегда находит индивидуальный подход. За полгода выросла от нуля до уверенного B2.', createdAt: daysAgo(2) },
    { tutorProfileId: mariaTutor.id,  studentProfileId: kate.id,   rating: 5, text: 'Лучший репетитор по английскому! Занимаемся уже 3 месяца, прогресс очевиден. Рекомендую всем, кто хочет быстро улучшить язык.', createdAt: daysAgo(7) },
    // Ivan
    { tutorProfileId: ivanTutor.id,   studentProfileId: dmitri.id, rating: 5, text: 'Иван Сергеевич — математик от бога. Объясняет каждую тему так, что даже сложные разделы становятся понятными. Готовлюсь к ЕГЭ — доволен на 100%.', createdAt: daysAgo(1) },
    // Alexei — Dmitri
    { tutorProfileId: alexeiTutor.id, studentProfileId: dmitri.id, rating: 5, text: 'Алексей очень грамотно объясняет физику — никакой зубрёжки, только понимание. С его помощью механика из страшного сна превратилась в любимую тему.', createdAt: daysAgo(3) },
    // Olga — Максим
    { tutorProfileId: olgaTutor.id,   studentProfileId: maksim.id, rating: 5, text: 'Ольга Андреевна — блестящий преподаватель. Сочинение ЕГЭ казалось непреодолимым, а теперь пишу без страха. Структура и доводы — всё встало на своих местах.', createdAt: daysAgo(9) },
    // Sergei — Максим
    { tutorProfileId: sergeiTutor.id, studentProfileId: maksim.id, rating: 5, text: 'Сергей — настоящий профессионал. Объясняет алгоритмы на реальных задачах, а не по учебнику. После занятий начал решать олимпиадные задачи сам.', createdAt: daysAgo(7) },
    // Anastasia — Арина
    { tutorProfileId: anastaTutor.id, studentProfileId: arina.id,  rating: 5, text: 'Анастасия Игоревна разложила всю биологию по полочкам! Генетика, которую я боялась, теперь кажется логичной. Советую всем, кто готовится к ОГЭ.', createdAt: daysAgo(5) },
    // Timur — Кирилл
    { tutorProfileId: timurTutor.id,  studentProfileId: kirill.id, rating: 5, text: 'Тимур — преподаватель от бога. Занятия живые, интересные, без занудства. За два месяца говорю по-английски значительно увереннее. Спасибо!', createdAt: daysAgo(6) },
    // Yulia — Кирилл (4★ — единственная не идеальная)
    { tutorProfileId: yuliaTutor.id,  studentProfileId: kirill.id, rating: 4, text: 'Юлия хорошо объясняет даты и события, занятия насыщенные. Иногда немного торопится с новым материалом, но в целом доволен прогрессом.', createdAt: daysAgo(10) },
  ]});

  console.log('✅ Database seeded successfully!');
  console.log('\nDemo accounts:');
  console.log('  Admin:    admin@demo.com / admin123');
  console.log('  Students: anna@demo.com, dmitri@demo.com, ekaterina@demo.com, maksim@demo.com, arina@demo.com, kirill@demo.com  (password123)');
  console.log('  Tutors:   maria@demo.com, ivan@demo.com, alexei@demo.com, olga@demo.com, sergei@demo.com, anastasia@demo.com, timur@demo.com, yulia@demo.com  (password123)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
