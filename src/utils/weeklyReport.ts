import { startOfWeek, endOfWeek, format, parseISO, isWithinInterval, subWeeks, subMonths, startOfMonth, endOfMonth, addDays, differenceInDays, getDay } from 'date-fns';
import type { Student, AttendanceRecord, GradeWeeklyStats, ClassWeeklyStats, WeeklyReport, WeeklyInsight, Grade, Class, PriorityAlert, PatternAnalysis, HomeSchoolAlert } from '../types';
import { studentStorage, attendanceStorage, sessionStorage } from './storage';
import { getActiveSession, getSessionForDate } from './session';
import { isHomeSchoolPeriod } from './attendance';

/**
 * 주간 리포트 생성
 */
export const generateWeeklyReport = (targetDate: Date = new Date()): WeeklyReport => {
  // 이번 주 월요일과 일요일 계산
  const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 }); // 월요일 시작
  const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 }); // 일요일 종료
  
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
  
  // 학생 데이터 로드
  const allStudents = studentStorage.load();
  
  // 활성 세션 확인
  const sessions = sessionStorage.load();
  const activeSession = getActiveSession(sessions);
  
  // 이번 주 출석 기록 수집
  const weekRecords: AttendanceRecord[] = [];
  for (let date = new Date(weekStart); date <= weekEnd; date.setDate(date.getDate() + 1)) {
    const dateStr = format(date, 'yyyy-MM-dd');
    const session = activeSession || getSessionForDate(dateStr, sessions);
    const records = attendanceStorage.load(session?.id);
    const dayRecords = records.filter(r => r.date === dateStr);
    weekRecords.push(...dayRecords);
  }
  
  // 학년별 통계 계산
  const gradeStats: Record<string, GradeWeeklyStats> = {};
  for (let grade = 1; grade <= 3; grade++) {
    const gradeStudents = allStudents.filter(s => s.grade === grade);
    const gradeRecords = weekRecords.filter(r => {
      const student = gradeStudents.find(s => s.id === r.studentId);
      return student !== undefined;
    });
    
    gradeStats[grade.toString()] = calculateGradeStats(grade as Grade, gradeStudents, gradeRecords);
  }
  
  // 반별 통계 계산
  const classStats: Record<string, ClassWeeklyStats> = {};
  for (let grade = 1; grade <= 3; grade++) {
    for (let classNum = 1; classNum <= 6; classNum++) {
      const classKey = `${grade}-${classNum}`;
      const classStudents = allStudents.filter(s => s.grade === grade && s.class === classNum);
      const classRecords = weekRecords.filter(r => {
        const student = classStudents.find(s => s.id === r.studentId);
        return student !== undefined;
      });
      
      const currentStats = calculateClassStats(grade as Grade, classNum as Class, classStudents, classRecords);
      
      // 전주 통계 계산
      const prevWeekStart = subWeeks(weekStart, 1);
      const prevWeekEnd = subWeeks(weekEnd, 1);
      const prevWeekRecords = getRecordsForPeriod(
        format(prevWeekStart, 'yyyy-MM-dd'),
        format(prevWeekEnd, 'yyyy-MM-dd'),
        sessions,
        activeSession
      );
      const prevWeekClassRecords = prevWeekRecords.filter(r => {
        const student = classStudents.find(s => s.id === r.studentId);
        return student !== undefined;
      });
      const prevWeekStats = calculateClassStats(grade as Grade, classNum as Class, classStudents, prevWeekClassRecords);
      
      // 전월 통계 계산 (이번 주가 속한 달의 전달)
      const prevMonthStart = startOfMonth(subMonths(weekStart, 1));
      const prevMonthEnd = endOfMonth(subMonths(weekStart, 1));
      const prevMonthRecords = getRecordsForPeriod(
        format(prevMonthStart, 'yyyy-MM-dd'),
        format(prevMonthEnd, 'yyyy-MM-dd'),
        sessions,
        activeSession
      );
      const prevMonthClassRecords = prevMonthRecords.filter(r => {
        const student = classStudents.find(s => s.id === r.studentId);
        return student !== undefined;
      });
      const prevMonthStats = calculateClassStats(grade as Grade, classNum as Class, classStudents, prevMonthClassRecords);
      
      classStats[classKey] = {
        ...currentStats,
        previousWeekStats: prevWeekStats,
        previousMonthStats: prevMonthStats,
      };
    }
  }
  
  // AI 인사이트 생성
  const insights = generateInsights(classStats, gradeStats);
  
  // 전주 기록 수집
  const prevWeekStart = subWeeks(weekStart, 1);
  const prevWeekEnd = subWeeks(weekEnd, 1);
  const prevWeekRecords = getRecordsForPeriod(
    format(prevWeekStart, 'yyyy-MM-dd'),
    format(prevWeekEnd, 'yyyy-MM-dd'),
    sessions,
    activeSession
  );
  
  // 전체 기록 수집 (장기 결석 분석용)
  const allRecords = getRecordsForPeriod(
    format(new Date(weekStart.getFullYear(), 0, 1), 'yyyy-MM-dd'),
    format(weekEnd, 'yyyy-MM-dd'),
    sessions,
    activeSession
  );
  
  // 관심 필요 학생 우선순위화
  const priorityAlerts = generatePriorityAlerts(allStudents, weekRecords, prevWeekRecords, weekStart, weekEnd);
  
  // 생활 리듬 & 학습 분위기 분석
  const patternAnalysis = generatePatternAnalysis(allStudents, weekRecords, weekStart);
  
  // 홈스쿨링 및 장기 결석자 관리
  const homeSchoolAlerts = generateHomeSchoolAlerts(allStudents, weekRecords, allRecords, weekStart, weekEnd);
  
  // 리포트 ID 생성 (연도-주차 형식)
  const year = format(weekStart, 'yyyy');
  const yearStart = new Date(parseInt(year), 0, 1);
  const weekNum = Math.ceil((weekStart.getTime() - yearStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const reportId = `${year}-W${weekNum}`;
  
  return {
    id: reportId,
    weekStartDate: weekStartStr,
    weekEndDate: weekEndStr,
    generatedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    gradeStats,
    classStats,
    insights,
    priorityAlerts,
    patternAnalysis,
    homeSchoolAlerts,
  };
};

/**
 * 특정 기간의 출석 기록 가져오기
 */
const getRecordsForPeriod = (
  startDate: string,
  endDate: string,
  sessions: any[],
  activeSession: any
): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dateStr = format(date, 'yyyy-MM-dd');
    const session = activeSession || getSessionForDate(dateStr, sessions);
    const dayRecords = attendanceStorage.load(session?.id);
    const filtered = dayRecords.filter(r => r.date === dateStr);
    records.push(...filtered);
  }
  
  return records;
};

/**
 * 학년별 통계 계산
 */
const calculateGradeStats = (
  grade: Grade,
  students: Student[],
  records: AttendanceRecord[]
): GradeWeeklyStats => {
  const totalStudents = students.length;
  
  // 각 학생의 총 교시 수 계산 (이번 주 기준)
  const studentPeriodCounts = new Map<string, number>();
  records.forEach(r => {
    const count = studentPeriodCounts.get(r.studentId) || 0;
    studentPeriodCounts.set(r.studentId, count + 1);
  });
  
  const totalPeriods = Array.from(studentPeriodCounts.values()).reduce((sum, count) => sum + count, 0);
  
  const present = records.filter(r => r.status === 'present').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const late = records.filter(r => r.status === 'late').length;
  const earlyLeave = records.filter(r => r.status === 'early_leave').length;
  const leave = records.filter(r => r.status === 'leave').length;
  const sick = records.filter(r => r.status === 'sick').length;
  const homeSchool = records.filter(r => r.status === 'home_school').length;
  const homeReturn = records.filter(r => r.status === 'home_return').length;
  
  const attendanceRate = totalPeriods > 0 ? (present / totalPeriods) * 100 : 0;
  const lateRate = totalPeriods > 0 ? (late / totalPeriods) * 100 : 0;
  const absentRate = totalPeriods > 0 ? (absent / totalPeriods) * 100 : 0;
  
  return {
    grade,
    totalStudents,
    totalPeriods,
    present,
    absent,
    late,
    earlyLeave,
    leave,
    sick,
    homeSchool,
    homeReturn,
    attendanceRate: Math.round(attendanceRate * 100) / 100,
    lateRate: Math.round(lateRate * 100) / 100,
    absentRate: Math.round(absentRate * 100) / 100,
  };
};

/**
 * 반별 통계 계산
 */
const calculateClassStats = (
  grade: Grade,
  classNum: Class,
  students: Student[],
  records: AttendanceRecord[]
): ClassWeeklyStats => {
  const stats = calculateGradeStats(grade, students, records);
  
  return {
    grade,
    class: classNum,
    totalStudents: stats.totalStudents,
    totalPeriods: stats.totalPeriods,
    present: stats.present,
    absent: stats.absent,
    late: stats.late,
    earlyLeave: stats.earlyLeave,
    leave: stats.leave,
    sick: stats.sick,
    homeSchool: stats.homeSchool,
    homeReturn: stats.homeReturn,
    attendanceRate: stats.attendanceRate,
    lateRate: stats.lateRate,
    absentRate: stats.absentRate,
  };
};

/**
 * AI 인사이트 생성
 */
const generateInsights = (
  classStats: Record<string, ClassWeeklyStats>,
  gradeStats: Record<string, GradeWeeklyStats>
): WeeklyInsight[] => {
  const insights: WeeklyInsight[] = [];
  
  // 반별 분석
  Object.entries(classStats).forEach(([classKey, stats]) => {
    const { grade, class: classNum, previousWeekStats, previousMonthStats } = stats;
    
    // 전주 대비 지각률 변화
    if (previousWeekStats) {
      const lateRateChange = stats.lateRate - previousWeekStats.lateRate;
      if (lateRateChange > 10) {
        insights.push({
          type: 'warning',
          message: `이번 주는 ${grade}학년 ${classNum}반의 지각률이 지난주 대비 ${Math.round(lateRateChange)}%p 상승했습니다. 상담이 필요할 수 있습니다.`,
          grade,
          class: classNum,
          metric: 'late_rate',
          change: Math.round(lateRateChange),
        });
      } else if (lateRateChange < -5) {
        insights.push({
          type: 'positive',
          message: `${grade}학년 ${classNum}반의 지각률이 지난주 대비 ${Math.round(Math.abs(lateRateChange))}%p 개선되었습니다.`,
          grade,
          class: classNum,
          metric: 'late_rate',
          change: Math.round(lateRateChange),
        });
      }
    }
    
    // 전월 대비 지각률 변화
    if (previousMonthStats) {
      const lateRateChange = stats.lateRate - previousMonthStats.lateRate;
      if (lateRateChange > 15) {
        insights.push({
          type: 'warning',
          message: `이번 주는 ${grade}학년 ${classNum}반의 지각률이 지난달 대비 ${Math.round(lateRateChange)}%p 상승했습니다. 상담이 필요할 수 있습니다.`,
          grade,
          class: classNum,
          metric: 'late_rate',
          change: Math.round(lateRateChange),
        });
      }
    }
    
    // 결석률 분석
    if (previousWeekStats) {
      const absentRateChange = stats.absentRate - previousWeekStats.absentRate;
      if (absentRateChange > 5) {
        insights.push({
          type: 'warning',
          message: `${grade}학년 ${classNum}반의 결석률이 지난주 대비 ${Math.round(absentRateChange)}%p 상승했습니다.`,
          grade,
          class: classNum,
          metric: 'absent_rate',
          change: Math.round(absentRateChange),
        });
      }
    }
    
    // 출석률 분석
    if (stats.attendanceRate < 90) {
      insights.push({
        type: 'warning',
        message: `${grade}학년 ${classNum}반의 출석률이 ${Math.round(stats.attendanceRate)}%로 낮습니다.`,
        grade,
        class: classNum,
        metric: 'attendance_rate',
      });
    }
  });
  
  // 학년별 분석
  Object.entries(gradeStats).forEach(([gradeStr, stats]) => {
    if (stats.attendanceRate < 85) {
      insights.push({
        type: 'info',
        message: `${stats.grade}학년 전체의 출석률이 ${Math.round(stats.attendanceRate)}%입니다.`,
        grade: stats.grade,
        metric: 'attendance_rate',
      });
    }
  });
  
  // 인사이트가 없으면 기본 메시지
  if (insights.length === 0) {
    insights.push({
      type: 'positive',
      message: '이번 주 출석 현황이 양호합니다.',
    });
  }
  
  return insights;
};

/**
 * 관심 필요 학생 우선순위화 생성
 */
const generatePriorityAlerts = (
  students: Student[],
  weekRecords: AttendanceRecord[],
  prevWeekRecords: AttendanceRecord[],
  weekStart: Date,
  weekEnd: Date
): PriorityAlert[] => {
  const alerts: PriorityAlert[] = [];
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  students.forEach(student => {
    const studentRecords = weekRecords.filter(r => r.studentId === student.id);
    const prevStudentRecords = prevWeekRecords.filter(r => r.studentId === student.id);

    // 1. 반복 지각 패턴 감지 (특정 요일, 특정 교시)
    const lateByDay: Record<string, number> = {};

    studentRecords.forEach(record => {
      if (record.status === 'late') {
        const recordDate = parseISO(record.date);
        const dayName = dayNames[getDay(recordDate)];
        lateByDay[dayName] = (lateByDay[dayName] || 0) + 1;
      }
    });

    // 월요일 1교시 지각이 2주 연속이면 경고
    const mondayLateCount = lateByDay['월'] || 0;
    const prevMondayLateCount = prevStudentRecords.filter(r => {
      const recordDate = parseISO(r.date);
      return getDay(recordDate) === 1 && r.status === 'late' && r.period === 1;
    }).length;

    if (mondayLateCount >= 2 && prevMondayLateCount >= 1) {
      alerts.push({
        id: `alert-${student.id}-repeated-late`,
        studentId: student.id,
        studentName: student.name,
        grade: student.grade,
        class: student.class,
        priority: 'high',
        category: 'repeated_late',
        title: '반복 지각 패턴 감지',
        description: `${student.name} 학생이 최근 2주간 월요일 1교시 지각이 반복되고 있습니다.`,
        recommendation: '주말 귀가 후 복귀 패턴 점검 필요',
        data: {
          repeatedDays: ['월'],
          period: 1,
        },
      });
    }

    // 2. 양호실 방문 급증 감지
    const healthVisits = studentRecords.filter(r => r.status === 'sick' || r.note?.includes('양호')).length;
    const prevHealthVisits = prevStudentRecords.filter(r => r.status === 'sick' || r.note?.includes('양호')).length;

    if (healthVisits >= 3 && healthVisits > prevHealthVisits * 2) {
      alerts.push({
        id: `alert-${student.id}-health`,
        studentId: student.id,
        studentName: student.name,
        grade: student.grade,
        class: student.class,
        priority: 'high',
        category: 'health_issue',
        title: '양호실 방문 급증',
        description: `${student.name} 학생이 이번 주 양호실(보건결석) 방문이 ${healthVisits}회로 급증했습니다.`,
        recommendation: '건강 상태 확인이 필요합니다.',
        data: {
          healthVisitCount: healthVisits,
        },
      });
    }

    // 3. 야간 자율학습 이탈 징후 (8교시 이후 무단 결과)
    const nightStudyAbsence: string[] = [];
    for (let i = 0; i <= 6; i++) {
      const checkDate = addDays(weekStart, i);
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      const dayRecords = studentRecords.filter(r => r.date === dateStr && r.period >= 8);
      const hasAbsent = dayRecords.some(r => r.status === 'absent' || r.status === 'early_leave');
      const hasPresent = dayRecords.some(r => r.status === 'present');
      
      // 정규 수업은 출석했지만 8교시 이후 무단 결과
      if (hasPresent && hasAbsent) {
        const earlierRecords = studentRecords.filter(r => r.date === dateStr && r.period < 8);
        const allPresentEarlier = earlierRecords.length > 0 && earlierRecords.every(r => r.status === 'present');
        
        if (allPresentEarlier) {
          nightStudyAbsence.push(dayNames[getDay(checkDate)]);
        }
      }
    }

    if (nightStudyAbsence.length >= 3) {
      alerts.push({
        id: `alert-${student.id}-night-study`,
        studentId: student.id,
        studentName: student.name,
        grade: student.grade,
        class: student.class,
        priority: 'high',
        category: 'night_study_absence',
        title: '야간 자율학습 이탈 징후',
        description: `${student.name} 학생이 정규 수업은 출석률 100%이나, 최근 3일 연속 8교시 이후(자습 시간) 무단 결과 처리되었습니다.`,
        recommendation: '기숙사 사감 선생님과 교차 확인을 권장합니다.',
        data: {
          nightStudyAbsenceDays: nightStudyAbsence,
        },
      });
    }

    // 4. 결석 누적 경고
    const absentDays = studentRecords.filter(r => r.status === 'absent' && !isHomeSchoolPeriod(student, r.date)).length;
    const totalDays = 7; // 주간 일수
    const attendanceRate = ((totalDays - absentDays) / totalDays) * 100;

    if (absentDays >= 3) {
      alerts.push({
        id: `alert-${student.id}-absent`,
        studentId: student.id,
        studentName: student.name,
        grade: student.grade,
        class: student.class,
        priority: 'high',
        category: 'absent_accumulation',
        title: '결석 누적 경고',
        description: `${student.name} 학생이 이번 주 ${absentDays}일 결석했습니다.`,
        recommendation: '학부모 면담이 필요할 수 있습니다.',
        data: {
          absentDays,
          attendanceRate,
        },
      });
    }
  });

  // 우선순위별 정렬 (high -> medium -> low)
  return alerts.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
};

/**
 * 생활 리듬 & 학습 분위기 분석 생성
 */
const generatePatternAnalysis = (
  students: Student[],
  weekRecords: AttendanceRecord[],
  weekStart: Date
): PatternAnalysis => {
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayOfWeekPattern = dayNames.slice(1, 6).map((dayName, index) => {
    const dayIndex = index + 1; // 월요일 = 1
    const dayRecords = weekRecords.filter(r => {
      const recordDate = parseISO(r.date);
      return getDay(recordDate) === dayIndex;
    });

    const totalPeriods = dayRecords.length;
    const lateCount = dayRecords.filter(r => r.status === 'late').length;
    const earlyLeaveCount = dayRecords.filter(r => r.status === 'early_leave').length;
    const absentCount = dayRecords.filter(r => {
      const student = students.find(s => s.id === r.studentId);
      return r.status === 'absent' && student && !isHomeSchoolPeriod(student, r.date);
    }).length;

    return {
      day: dayName,
      lateRate: totalPeriods > 0 ? (lateCount / totalPeriods) * 100 : 0,
      earlyLeaveRate: totalPeriods > 0 ? (earlyLeaveCount / totalPeriods) * 100 : 0,
      absentRate: totalPeriods > 0 ? (absentCount / totalPeriods) * 100 : 0,
    };
  });

  // 교시별 패턴 분석
  const periodPattern = Array.from({ length: 12 }, (_, i) => i + 1).map(period => {
    const periodRecords = weekRecords.filter(r => r.period === period);
    const totalPeriods = periodRecords.length;
    const absentCount = periodRecords.filter(r => {
      const student = students.find(s => s.id === r.studentId);
      return r.status === 'absent' && student && !isHomeSchoolPeriod(student, r.date);
    }).length;
    const earlyLeaveCount = periodRecords.filter(r => r.status === 'early_leave').length;
    const healthVisitCount = periodRecords.filter(r => r.status === 'sick' || r.note?.includes('양호')).length;

    return {
      period,
      absentRate: totalPeriods > 0 ? (absentCount / totalPeriods) * 100 : 0,
      earlyLeaveRate: totalPeriods > 0 ? (earlyLeaveCount / totalPeriods) * 100 : 0,
      healthVisitRate: totalPeriods > 0 ? (healthVisitCount / totalPeriods) * 100 : 0,
    };
  });

  // 가장 피로한 요일 찾기 (지각+조퇴+결석률 합계가 가장 높은 요일)
  const fatigueDay = dayOfWeekPattern.length > 0 ? dayOfWeekPattern.reduce((max, day) => {
    const total = day.lateRate + day.earlyLeaveRate + day.absentRate;
    const maxTotal = max.lateRate + max.earlyLeaveRate + max.absentRate;
    return total > maxTotal ? day : max;
  }, dayOfWeekPattern[0])?.day : undefined;

  // 집중도가 낮은 교시 (결석+조퇴률이 가장 높은 교시)
  const concentrationPeriod = periodPattern.length > 0 ? periodPattern.reduce((max, p) => {
    const total = p.absentRate + p.earlyLeaveRate;
    const maxTotal = max.absentRate + max.earlyLeaveRate;
    return total > maxTotal ? p : max;
  }, periodPattern[0])?.period : undefined;

  // 양호실 방문이 많은 교시
  const healthIssuePeriod = periodPattern.length > 0 ? periodPattern.reduce((max, p) => {
    return p.healthVisitRate > max.healthVisitRate ? p : max;
  }, periodPattern[0])?.period : undefined;

  return {
    dayOfWeekPattern,
    periodPattern,
    insights: {
      fatigueDay,
      concentrationPeriod,
      healthIssuePeriod,
    },
  };
};

/**
 * 홈스쿨링 및 장기 결석자 관리 생성
 */
const generateHomeSchoolAlerts = (
  students: Student[],
  weekRecords: AttendanceRecord[],
  allRecords: AttendanceRecord[],
  weekStart: Date,
  weekEnd: Date
): HomeSchoolAlert[] => {
  const alerts: HomeSchoolAlert[] = [];
  const today = new Date();

  students.forEach(student => {
    // 홈스쿨링 복귀 예정 알림
    if (student.isHomeSchool && student.homeSchoolEndDate) {
      const endDate = parseISO(student.homeSchoolEndDate);
      const daysRemaining = differenceInDays(endDate, today);

      if (daysRemaining >= 0 && daysRemaining <= 7) {
        alerts.push({
          studentId: student.id,
          studentName: student.name,
          grade: student.grade,
          class: student.class,
          type: 'home_school_return',
          message: `${student.name} 학생의 홈스쿨링 기간이 ${daysRemaining}일 남았습니다.`,
          daysRemaining,
          riskLevel: daysRemaining <= 3 ? 'high' : 'medium',
        });
      }
    }

    // 결석 누적 경고 (유급 방지)
    const studentAllRecords = allRecords.filter(r => r.studentId === student.id);
    const uniqueDates = new Set(studentAllRecords.map(r => r.date));
    const totalDays = uniqueDates.size;
    const absentDays = Array.from(uniqueDates).filter(date => {
      const dayRecords = studentAllRecords.filter(r => r.date === date);
      return dayRecords.some(r => r.status === 'absent' && !isHomeSchoolPeriod(student, date));
    }).length;
    
    const attendanceRate = totalDays > 0 ? ((totalDays - absentDays) / totalDays) * 100 : 100;
    const requiredAttendanceRate = 66.7; // 수료 기준 (2/3)
    const maxAbsentDays = Math.floor(totalDays * (1 - requiredAttendanceRate / 100));
    const remainingAbsentDays = maxAbsentDays - absentDays;

    if (attendanceRate < requiredAttendanceRate && remainingAbsentDays <= 5) {
      alerts.push({
        studentId: student.id,
        studentName: student.name,
        grade: student.grade,
        class: student.class,
        type: 'absent_warning',
        message: `현재 ${student.name} 학생의 수업 일수 대비 출석률은 ${attendanceRate.toFixed(1)}%입니다.`,
        attendanceRate,
        absentDays,
        requiredAttendanceRate,
        riskLevel: remainingAbsentDays <= 2 ? 'high' : remainingAbsentDays <= 5 ? 'medium' : 'low',
      });
    }
  });

  return alerts;
};

