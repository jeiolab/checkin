import { useState, useEffect, useMemo, memo } from 'react';
import { CheckCircle2, XCircle, Clock, LogOut, DoorOpen, Heart, Home, ArrowLeftRight, Search, ChevronLeft, ChevronRight, Users, BarChart3 } from 'lucide-react';
import { studentStorage, attendanceStorage, configStorage, sessionStorage } from '../utils/storage';
import { getActiveSession } from '../utils/session';
import type { Student, AttendanceRecord, AttendanceConfig, AttendanceStats } from '../types';
import { calculateAttendanceStats, getStatusColor } from '../utils/attendance';
import './AttendanceStats.css';

export default function AttendanceStats() {
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [config, setConfig] = useState<AttendanceConfig | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<1 | 2 | 3 | null>(null);
  const [selectedClass, setSelectedClass] = useState<1 | 2 | 3 | 4 | 5 | 6 | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  useEffect(() => {
    setStudents(studentStorage.load());
    
    // 활성 세션 확인
    const sessions = sessionStorage.load();
    const activeSession = getActiveSession(sessions);
    const sessionId = activeSession?.id;
    
    setRecords(attendanceStorage.load(sessionId));
    setConfig(configStorage.load(sessionId));
    
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(formatDate(firstDay));
    setEndDate(formatDate(today));
  }, []);

  // 필터링된 학생 목록 (메모이제이션)
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (selectedGrade && s.grade !== selectedGrade) return false;
      if (selectedClass && s.class !== selectedClass) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = s.name.toLowerCase().includes(query);
        const numberMatch = s.number.toString().includes(query);
        const classMatch = `${s.grade}학년 ${s.class}반`.includes(query);
        if (!nameMatch && !numberMatch && !classMatch) return false;
      }
      return true;
    });
  }, [students, selectedGrade, selectedClass, searchQuery]);

  // 필터링된 기록 (메모이제이션)
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;
      return true;
    });
  }, [records, startDate, endDate]);

  // 전체 교시 수 계산 (메모이제이션)
  const totalPeriods = useMemo(() => {
    return config?.dayPeriodRanges
      .filter(range => {
        if (startDate && range.date < startDate) return false;
        if (endDate && range.date > endDate) return false;
        return true;
      })
      .reduce((sum, range) => sum + (range.endPeriod - range.startPeriod + 1), 0) || 0;
  }, [config, startDate, endDate]);

  // 통계 계산 (메모이제이션)
  const stats = useMemo(() => {
    return filteredStudents.map(student => 
      calculateAttendanceStats(student, filteredRecords, totalPeriods)
    );
  }, [filteredStudents, filteredRecords, totalPeriods]);

  // 정렬된 통계 (메모이제이션)
  const sortedStats = useMemo(() => {
    return [...stats].sort((a, b) => {
      return b.attendanceRate - a.attendanceRate;
    });
  }, [stats]);

  // 페이지네이션 계산
  const totalPages = Math.ceil(sortedStats.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStats = sortedStats.slice(startIndex, endIndex);

  // 페이지 변경 시 상단으로 스크롤
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedGrade, selectedClass, searchQuery, startDate, endDate]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  // 전체 통계 계산 (메모이제이션)
  const overallStats = useMemo(() => {
    return {
      totalStudents: filteredStudents.length,
      avgAttendanceRate: stats.length > 0
        ? Math.round((stats.reduce((sum, s) => sum + s.attendanceRate, 0) / stats.length) * 100) / 100
        : 0,
      totalPresent: stats.reduce((sum, s) => sum + s.present, 0),
      totalAbsent: stats.reduce((sum, s) => sum + s.absent, 0),
      totalLate: stats.reduce((sum, s) => sum + s.late, 0),
      totalEarlyLeave: stats.reduce((sum, s) => sum + s.earlyLeave, 0),
      totalLeave: stats.reduce((sum, s) => sum + s.leave, 0),
      totalSick: stats.reduce((sum, s) => sum + s.sick, 0),
      totalHomeSchool: stats.reduce((sum, s) => sum + s.homeSchool, 0),
      totalHomeReturn: stats.reduce((sum, s) => sum + s.homeReturn, 0),
    };
  }, [filteredStudents.length, stats]);

  return (
    <div className="attendance-stats">
      <div className="stats-header">
        <h2>출석 통계</h2>
        <div className="stats-filters">
          <select
            value={selectedGrade || ''}
            onChange={(e) => setSelectedGrade(e.target.value ? Number(e.target.value) as 1 | 2 | 3 : null)}
            className="filter-select"
          >
            <option value="">전체 학년</option>
            <option value="1">1학년</option>
            <option value="2">2학년</option>
            <option value="3">3학년</option>
          </select>
          <select
            value={selectedClass || ''}
            onChange={(e) => setSelectedClass(e.target.value ? Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6 : null)}
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
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="date-input"
          />
          <span>~</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="date-input"
          />
        </div>
      </div>

      <div className="overall-stats-section">
        <h3 className="section-title">전체 통계 요약</h3>
        <div className="overall-stats-grid">
          <div className="stat-card-primary">
            <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <Users size={24} />
            </div>
            <div className="stat-content-primary">
              <div className="stat-label-primary">전체 학생</div>
              <div className="stat-value-primary">{overallStats.totalStudents}명</div>
            </div>
          </div>

          <div className="stat-card-primary highlight-primary">
            <div className="stat-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.2)' }}>
              <BarChart3 size={24} />
            </div>
            <div className="stat-content-primary">
              <div className="stat-label-primary">평균 출석률</div>
              <div className="stat-value-primary">{overallStats.avgAttendanceRate}%</div>
              <div className="stat-trend">
                {overallStats.avgAttendanceRate >= 95 ? (
                  <span className="trend-up">↑ 우수</span>
                ) : overallStats.avgAttendanceRate >= 80 ? (
                  <span className="trend-mid">→ 보통</span>
                ) : (
                  <span className="trend-down">↓ 주의</span>
                )}
              </div>
            </div>
          </div>

          <div className="stat-card-enhanced" style={{ borderLeftColor: getStatusColor('present') }}>
            <div className="stat-icon-enhanced" style={{ color: getStatusColor('present') }}>
              <CheckCircle2 size={20} />
            </div>
            <div className="stat-content-enhanced">
              <div className="stat-label-enhanced">총 출석</div>
              <div className="stat-value-enhanced" style={{ color: getStatusColor('present') }}>{overallStats.totalPresent.toLocaleString()}건</div>
            </div>
            <div className="stat-badge" style={{ background: `${getStatusColor('present')}15`, color: getStatusColor('present') }}>
              정상
            </div>
          </div>

          <div className="stat-card-enhanced" style={{ borderLeftColor: getStatusColor('absent') }}>
            <div className="stat-icon-enhanced" style={{ color: getStatusColor('absent') }}>
              <XCircle size={20} />
            </div>
            <div className="stat-content-enhanced">
              <div className="stat-label-enhanced">총 결석</div>
              <div className="stat-value-enhanced" style={{ color: getStatusColor('absent') }}>{overallStats.totalAbsent.toLocaleString()}건</div>
            </div>
            <div className="stat-badge" style={{ background: `${getStatusColor('absent')}15`, color: getStatusColor('absent') }}>
              {overallStats.totalAbsent > 0 ? '주의' : '양호'}
            </div>
          </div>

          <div className="stat-card-enhanced" style={{ borderLeftColor: getStatusColor('late') }}>
            <div className="stat-icon-enhanced" style={{ color: getStatusColor('late') }}>
              <Clock size={20} />
            </div>
            <div className="stat-content-enhanced">
              <div className="stat-label-enhanced">총 지각</div>
              <div className="stat-value-enhanced" style={{ color: getStatusColor('late') }}>{overallStats.totalLate.toLocaleString()}건</div>
            </div>
          </div>

          <div className="stat-card-enhanced" style={{ borderLeftColor: getStatusColor('early_leave') }}>
            <div className="stat-icon-enhanced" style={{ color: getStatusColor('early_leave') }}>
              <LogOut size={20} />
            </div>
            <div className="stat-content-enhanced">
              <div className="stat-label-enhanced">총 조퇴</div>
              <div className="stat-value-enhanced" style={{ color: getStatusColor('early_leave') }}>{overallStats.totalEarlyLeave.toLocaleString()}건</div>
            </div>
          </div>

          <div className="stat-card-enhanced" style={{ borderLeftColor: getStatusColor('leave') }}>
            <div className="stat-icon-enhanced" style={{ color: getStatusColor('leave') }}>
              <DoorOpen size={20} />
            </div>
            <div className="stat-content-enhanced">
              <div className="stat-label-enhanced">총 외출</div>
              <div className="stat-value-enhanced" style={{ color: getStatusColor('leave') }}>{overallStats.totalLeave.toLocaleString()}건</div>
            </div>
          </div>

          <div className="stat-card-enhanced" style={{ borderLeftColor: getStatusColor('sick') }}>
            <div className="stat-icon-enhanced" style={{ color: getStatusColor('sick') }}>
              <Heart size={20} />
            </div>
            <div className="stat-content-enhanced">
              <div className="stat-label-enhanced">총 병결</div>
              <div className="stat-value-enhanced" style={{ color: getStatusColor('sick') }}>{overallStats.totalSick.toLocaleString()}건</div>
            </div>
          </div>

          <div className="stat-card-enhanced" style={{ borderLeftColor: getStatusColor('home_school') }}>
            <div className="stat-icon-enhanced" style={{ color: getStatusColor('home_school') }}>
              <Home size={20} />
            </div>
            <div className="stat-content-enhanced">
              <div className="stat-label-enhanced">총 홈스쿨링</div>
              <div className="stat-value-enhanced" style={{ color: getStatusColor('home_school') }}>{overallStats.totalHomeSchool.toLocaleString()}건</div>
            </div>
          </div>

          <div className="stat-card-enhanced" style={{ borderLeftColor: getStatusColor('home_return') }}>
            <div className="stat-icon-enhanced" style={{ color: getStatusColor('home_return') }}>
              <ArrowLeftRight size={20} />
            </div>
            <div className="stat-content-enhanced">
              <div className="stat-label-enhanced">총 귀가</div>
              <div className="stat-value-enhanced" style={{ color: getStatusColor('home_return') }}>{overallStats.totalHomeReturn.toLocaleString()}건</div>
            </div>
          </div>
        </div>
      </div>

      <div className="students-stats-section">
        <div className="section-header">
          <h3>학생별 상세 통계</h3>
          <div className="stats-summary">
            <span className="summary-text">총 {sortedStats.length}명</span>
            {sortedStats.length !== students.length && (
              <span className="filtered-text">(필터링됨)</span>
            )}
          </div>
        </div>

        <div className="search-and-controls">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="이름, 번호, 학년/반으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="clear-search"
              >
                ✕
              </button>
            )}
          </div>
          <div className="page-size-selector">
            <label>
              페이지당 표시:
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="page-size-select"
              >
                <option value="10">10개</option>
                <option value="20">20개</option>
                <option value="50">50개</option>
                <option value="100">100개</option>
              </select>
            </label>
          </div>
        </div>

        {paginatedStats.length === 0 ? (
          <div className="no-results">
            <p>검색 결과가 없습니다.</p>
          </div>
        ) : (
          <>
            <div className="students-stats-grid-compact">
              {paginatedStats.map(stat => {
                const student = students.find(s => s.id === stat.studentId);
                if (!student) return null;
                
                return (
                  <StudentStatCard key={stat.studentId} stat={stat} student={student} />
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  <ChevronLeft size={18} />
                  이전
                </button>
                <div className="pagination-info">
                  <span>
                    {startIndex + 1} - {Math.min(endIndex, sortedStats.length)} / {sortedStats.length}
                  </span>
                  <span className="page-numbers">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`page-number ${currentPage === pageNum ? 'active' : ''}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </span>
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  다음
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// 학생 통계 간략 카드 컴포넌트
const StudentStatCard = memo(({ stat, student }: { stat: AttendanceStats; student: Student }) => {
  const attendanceRateColor = 
    stat.attendanceRate >= 95 ? '#10b981' :
    stat.attendanceRate >= 80 ? '#f59e0b' :
    '#ef4444';

  const attendanceRateBg = 
    stat.attendanceRate >= 95 ? 'rgba(16, 185, 129, 0.1)' :
    stat.attendanceRate >= 80 ? 'rgba(245, 158, 11, 0.1)' :
    'rgba(239, 68, 68, 0.1)';

  return (
    <div className="student-stat-card-compact">
      <div className="compact-header">
        <div className="compact-student-info">
          <span className="compact-number">{student.number}번</span>
          <span className="compact-name">{student.name}</span>
          <span className="compact-class">{student.grade}-{student.class}</span>
          {student.isHomeSchool && <span className="badge-compact homeschool">홈스</span>}
          {student.isHomeReturn && <span className="badge-compact return">귀가</span>}
        </div>
        <div className="compact-rate" style={{ background: attendanceRateBg, color: attendanceRateColor }}>
          {stat.attendanceRate}%
        </div>
      </div>
      <div className="compact-progress">
        <div 
          className="compact-progress-bar" 
          style={{ 
            width: `${stat.attendanceRate}%`,
            backgroundColor: attendanceRateColor 
          }}
        />
      </div>
      <div className="compact-stats">
        <span className="stat-item-compact" style={{ color: getStatusColor('present') }}>
          출석 {stat.present}
        </span>
        <span className="stat-item-compact" style={{ color: getStatusColor('absent') }}>
          결석 {stat.absent}
        </span>
        <span className="stat-item-compact" style={{ color: getStatusColor('late') }}>
          지각 {stat.late}
        </span>
        {stat.earlyLeave > 0 && (
          <span className="stat-item-compact" style={{ color: getStatusColor('early_leave') }}>
            조퇴 {stat.earlyLeave}
          </span>
        )}
        {stat.leave > 0 && (
          <span className="stat-item-compact" style={{ color: getStatusColor('leave') }}>
            외출 {stat.leave}
          </span>
        )}
        {stat.sick > 0 && (
          <span className="stat-item-compact" style={{ color: getStatusColor('sick') }}>
            병결 {stat.sick}
          </span>
        )}
      </div>
    </div>
  );
});

StudentStatCard.displayName = 'StudentStatCard';

