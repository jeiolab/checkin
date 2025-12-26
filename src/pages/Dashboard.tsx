import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Users, BarChart3, Calendar } from 'lucide-react';
import { studentStorage, attendanceStorage, configStorage, sessionStorage } from '../utils/storage';
import { getActiveSession } from '../utils/session';
import type { Student, AttendanceRecord, AttendanceConfig } from '../types';
import { calculateAttendanceStats } from '../utils/attendance';
import './Dashboard.css';

export default function Dashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [config, setConfig] = useState<AttendanceConfig | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<1 | 2 | 3 | null>(null);
  const [selectedClass, setSelectedClass] = useState<1 | 2 | 3 | 4 | 5 | 6 | null>(null);

  useEffect(() => {
    setStudents(studentStorage.load());
    
    // 활성 세션 확인
    const sessions = sessionStorage.load();
    const activeSession = getActiveSession(sessions);
    const sessionId = activeSession?.id;
    
    setRecords(attendanceStorage.load(sessionId));
    setConfig(configStorage.load(sessionId));
  }, []);

  // 필터링된 학생 목록 (메모이제이션)
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (selectedGrade && s.grade !== selectedGrade) return false;
      if (selectedClass && s.class !== selectedClass) return false;
      return true;
    });
  }, [students, selectedGrade, selectedClass]);

  // 전체 교시 수 계산 (메모이제이션)
  const totalPeriods = useMemo(() => {
    return config?.dayPeriodRanges.reduce((sum, range) => {
      return sum + (range.endPeriod - range.startPeriod + 1);
    }, 0) || 0;
  }, [config]);

  // 통계 계산 (메모이제이션)
  const stats = useMemo(() => {
    return filteredStudents.map(student => 
      calculateAttendanceStats(student, records, totalPeriods)
    );
  }, [filteredStudents, records, totalPeriods]);

  // 전체 통계 (메모이제이션)
  const overallStats = useMemo(() => {
    return {
      totalStudents: filteredStudents.length,
      avgAttendanceRate: stats.length > 0
        ? Math.round((stats.reduce((sum, s) => sum + s.attendanceRate, 0) / stats.length) * 100) / 100
        : 0,
      totalAbsent: stats.reduce((sum, s) => sum + s.absent, 0),
      totalLate: stats.reduce((sum, s) => sum + s.late, 0),
    };
  }, [filteredStudents.length, stats]);

  // 필터 핸들러 (메모이제이션)
  const handleGradeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGrade(e.target.value ? Number(e.target.value) as 1 | 2 | 3 : null);
  }, []);

  const handleClassChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClass(e.target.value ? Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6 : null);
  }, []);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>대시보드</h2>
        <div className="filter-controls">
          <select
            value={selectedGrade || ''}
            onChange={handleGradeChange}
            className="filter-select"
          >
            <option value="">전체 학년</option>
            <option value="1">1학년</option>
            <option value="2">2학년</option>
            <option value="3">3학년</option>
          </select>
          <select
            value={selectedClass || ''}
            onChange={handleClassChange}
            className="filter-select"
          >
            <option value="">전체 반</option>
            <option value="1">1반</option>
            <option value="2">2반</option>
            <option value="3">3반</option>
            <option value="4">4반</option>
            <option value="5">5반</option>
            <option value="6">6반</option>
          </select>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#667eea' }}>
            <Users size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">전체 학생</div>
            <div className="stat-value">{overallStats.totalStudents}명</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#10b981' }}>
            <BarChart3 size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">평균 출석률</div>
            <div className="stat-value">{overallStats.avgAttendanceRate}%</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ef4444' }}>
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">총 결석</div>
            <div className="stat-value">{overallStats.totalAbsent}건</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f59e0b' }}>
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">총 지각</div>
            <div className="stat-value">{overallStats.totalLate}건</div>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h3>빠른 작업</h3>
        <div className="action-grid">
          <Link to="/attendance" className="action-card">
            <BookOpen size={32} />
            <span>출석부 열기</span>
          </Link>
          <Link to="/students" className="action-card">
            <Users size={32} />
            <span>학생 관리</span>
          </Link>
          <Link to="/stats" className="action-card">
            <BarChart3 size={32} />
            <span>출석 통계</span>
          </Link>
        </div>
      </div>

      {config && (
        <div className="current-config">
          <h3>현재 설정</h3>
          <div className="config-info">
            <div><strong>학기:</strong> {config.semester}</div>
            <div><strong>학년/반:</strong> {config.grade}학년 {config.class}반</div>
            <div><strong>설정된 날짜:</strong> {config.dayPeriodRanges.length}일</div>
          </div>
        </div>
      )}
    </div>
  );
}

