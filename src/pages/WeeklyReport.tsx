import { useState, useEffect } from 'react';
import { format, parseISO, startOfWeek } from 'date-fns';
import { FileText, TrendingUp, TrendingDown, AlertTriangle, Info, CheckCircle2, Calendar, AlertCircle, Clock, Activity, Home, UserX, Trash2 } from 'lucide-react';
import { weeklyReportStorage } from '../utils/storage';
import { generateWeeklyReport } from '../utils/weeklyReport';
import type { WeeklyReport, WeeklyInsight, Grade, Class } from '../types';
import './WeeklyReport.css';

export default function WeeklyReport() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = () => {
    const loadedReports = weeklyReportStorage.load();
    setReports(loadedReports.sort((a, b) => 
      new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime()
    ));
    
    // 가장 최근 리포트 선택
    if (loadedReports.length > 0 && !selectedReport) {
      setSelectedReport(loadedReports[0]);
    }
  };

  const handleGenerateReport = () => {
    const newReport = generateWeeklyReport();
    const updated = [newReport, ...reports];
    weeklyReportStorage.save(updated);
    setReports(updated);
    setSelectedReport(newReport);
  };

  const handleGenerateThisWeek = () => {
    const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const reportId = `W${format(thisWeekStart, 'w')}-${format(thisWeekStart, 'yyyy')}`;
    
    // 이미 생성된 리포트인지 확인
    const existing = reports.find(r => r.id === reportId);
    if (existing) {
      if (confirm('이번 주 리포트가 이미 존재합니다. 다시 생성하시겠습니까?')) {
        const newReport = generateWeeklyReport();
        const updated = reports.map(r => r.id === reportId ? newReport : r);
        weeklyReportStorage.save(updated);
        setReports(updated);
        setSelectedReport(newReport);
      }
    } else {
      handleGenerateReport();
    }
  };

  const handleDeleteReport = (reportId: string) => {
    if (confirm('이 리포트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      const updated = reports.filter(r => r.id !== reportId);
      weeklyReportStorage.save(updated);
      setReports(updated);
      
      // 삭제된 리포트가 선택된 리포트였다면 다른 리포트 선택
      if (selectedReport?.id === reportId) {
        if (updated.length > 0) {
          setSelectedReport(updated[0]);
        } else {
          setSelectedReport(null);
        }
      }
    }
  };

  const handleDeleteAllReports = () => {
    if (confirm('모든 리포트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      weeklyReportStorage.save([]);
      setReports([]);
      setSelectedReport(null);
    }
  };

  const getInsightIcon = (type: WeeklyInsight['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle size={18} />;
      case 'info':
        return <Info size={18} />;
      case 'positive':
        return <CheckCircle2 size={18} />;
    }
  };

  const getInsightColor = (type: WeeklyInsight['type']) => {
    switch (type) {
      case 'warning':
        return '#ef4444';
      case 'info':
        return '#3b82f6';
      case 'positive':
        return '#10b981';
    }
  };

  const filteredClassStats = selectedReport ? Object.entries(selectedReport.classStats).filter(([, stats]) => {
    if (selectedGrade && stats.grade !== selectedGrade) return false;
    if (selectedClass && stats.class !== selectedClass) return false;
    return true;
  }) : [];

  return (
    <div className="weekly-report">
      <div className="report-header">
        <div>
          <h2>주간 출석 리포트</h2>
          <p className="header-description">매주 월요일 아침, 지난주 출석 현황을 분석한 리포트를 제공합니다.</p>
        </div>
        <div className="header-actions">
          <button onClick={handleGenerateThisWeek} className="generate-btn">
            <Calendar size={18} />
            <span>이번 주 리포트 생성</span>
          </button>
          <button onClick={handleGenerateReport} className="generate-btn secondary">
            <FileText size={18} />
            <span>수동 생성</span>
          </button>
        </div>
      </div>

      {reports.length > 0 && (
        <div className="report-selector">
          <label>리포트 선택:</label>
          <select
            value={selectedReport?.id || ''}
            onChange={(e) => {
              const report = reports.find(r => r.id === e.target.value);
              setSelectedReport(report || null);
            }}
            className="report-select"
          >
            {reports.map(report => (
              <option key={report.id} value={report.id}>
                {format(parseISO(report.weekStartDate), 'yyyy년 MM월 dd일')} ~ {format(parseISO(report.weekEndDate), 'MM월 dd일')}
              </option>
            ))}
          </select>
          {selectedReport && (
            <button
              onClick={() => handleDeleteReport(selectedReport.id)}
              className="delete-report-btn"
              title="이 리포트 삭제"
            >
              <Trash2 size={16} />
              <span>삭제</span>
            </button>
          )}
          <button
            onClick={handleDeleteAllReports}
            className="delete-all-reports-btn"
            title="모든 리포트 삭제"
          >
            <Trash2 size={16} />
            <span>전체 삭제</span>
          </button>
        </div>
      )}

      {selectedReport && (
        <div className="report-content">
          <div className="report-period">
            <Calendar size={20} />
            <span>
              {format(parseISO(selectedReport.weekStartDate), 'yyyy년 MM월 dd일')} ~ {format(parseISO(selectedReport.weekEndDate), 'yyyy년 MM월 dd일')}
            </span>
            <span className="generated-at">
              생성일시: {format(parseISO(selectedReport.generatedAt), 'yyyy-MM-dd HH:mm')}
            </span>
            <button
              onClick={() => handleDeleteReport(selectedReport.id)}
              className="delete-report-inline-btn"
              title="이 리포트 삭제"
            >
              <Trash2 size={16} />
              <span>삭제</span>
            </button>
          </div>

          {/* 관심 필요 학생 우선순위화 */}
          {selectedReport.priorityAlerts && selectedReport.priorityAlerts.length > 0 && (
            <div className="priority-alerts-section">
              <h3>
                <AlertCircle size={20} />
                관심 필요 학생 (Priority Alert)
              </h3>
              <p className="section-description">상담이 시급한 학생을 우선순위별로 표시합니다.</p>
              <div className="priority-alerts-list">
                {selectedReport.priorityAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`priority-alert priority-${alert.priority}`}
                  >
                    <div className="priority-header">
                      <div className="priority-badge">{alert.priority === 'high' ? '긴급' : alert.priority === 'medium' ? '주의' : '참고'}</div>
                      <div className="priority-student">
                        <strong>{alert.studentName}</strong>
                        <span className="student-class">{alert.grade}학년 {alert.class}반</span>
                      </div>
                    </div>
                    <div className="priority-content">
                      <h4>{alert.title}</h4>
                      <p className="priority-description">{alert.description}</p>
                      <p className="priority-recommendation">
                        <strong>권장 조치:</strong> {alert.recommendation}
                      </p>
                      {alert.data && (
                        <div className="priority-data">
                          {alert.data.repeatedDays && (
                            <span>반복 요일: {alert.data.repeatedDays.join(', ')}</span>
                          )}
                          {alert.data.healthVisitCount && (
                            <span>양호실 방문: {alert.data.healthVisitCount}회</span>
                          )}
                          {alert.data.nightStudyAbsenceDays && (
                            <span>야간 자율학습 이탈: {alert.data.nightStudyAbsenceDays.join(', ')}</span>
                          )}
                          {alert.data.absentDays && (
                            <span>결석 일수: {alert.data.absentDays}일</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 생활 리듬 & 학습 분위기 분석 */}
          {selectedReport.patternAnalysis && (
            <div className="pattern-analysis-section">
              <h3>
                <Activity size={20} />
                생활 리듬 & 학습 분위기 분석
              </h3>
              
              {/* 요일별 피로도 분석 */}
              <div className="pattern-subsection">
                <h4>
                  <Clock size={18} />
                  요일별 피로도 분석
                </h4>
                <div className="day-pattern-chart">
                  {selectedReport.patternAnalysis.dayOfWeekPattern.map((day) => {
                    return (
                      <div key={day.day} className="day-pattern-item">
                        <div className="day-label">{day.day}요일</div>
                        <div className="day-bars">
                          <div className="bar-container">
                            <div className="bar-label">지각</div>
                            <div className="bar">
                              <div
                                className="bar-fill late"
                                style={{ width: `${Math.min(day.lateRate, 100)}%` }}
                              />
                              <span className="bar-value">{day.lateRate.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div className="bar-container">
                            <div className="bar-label">조퇴</div>
                            <div className="bar">
                              <div
                                className="bar-fill early-leave"
                                style={{ width: `${Math.min(day.earlyLeaveRate, 100)}%` }}
                              />
                              <span className="bar-value">{day.earlyLeaveRate.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div className="bar-container">
                            <div className="bar-label">결석</div>
                            <div className="bar">
                              <div
                                className="bar-fill absent"
                                style={{ width: `${Math.min(day.absentRate, 100)}%` }}
                              />
                              <span className="bar-value">{day.absentRate.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {selectedReport.patternAnalysis.insights.fatigueDay && (
                  <div className="pattern-insight">
                    <Info size={16} />
                    <span>
                      우리 반은 <strong>{selectedReport.patternAnalysis.insights.fatigueDay}요일</strong>에 지각/조퇴가 가장 많습니다. 
                      {selectedReport.patternAnalysis.insights.fatigueDay === '목' ? ' 수요일 저녁 점호 이후 취침 지도가 잘 이루어지고 있는지 확인해 보세요.' : ' 해당 요일 전날 생활 패턴을 점검해 보세요.'}
                    </span>
                  </div>
                )}
              </div>

              {/* 교시별 집중도 히트맵 */}
              <div className="pattern-subsection">
                <h4>
                  <Activity size={18} />
                  교시별 집중도 히트맵
                </h4>
                <div className="period-heatmap">
                  <div className="heatmap-header">
                    <div className="heatmap-label">교시</div>
                    <div className="heatmap-metrics">
                      <span>결석률</span>
                      <span>조퇴률</span>
                      <span>양호실</span>
                    </div>
                  </div>
                  {selectedReport.patternAnalysis.periodPattern.map((period) => {
                    const maxRate = Math.max(period.absentRate, period.earlyLeaveRate, period.healthVisitRate);
                    const intensity = Math.min(maxRate / 50, 1); // 50%를 최대 강도로
                    return (
                      <div key={period.period} className="heatmap-row">
                        <div className="heatmap-period">{period.period}교시</div>
                        <div className="heatmap-values">
                          <div
                            className="heatmap-cell"
                            style={{
                              backgroundColor: `rgba(239, 68, 68, ${0.3 + intensity * 0.7})`,
                              color: intensity > 0.5 ? 'white' : '#1f2937',
                            }}
                            title={`결석률: ${period.absentRate.toFixed(1)}%`}
                          >
                            {period.absentRate.toFixed(1)}%
                          </div>
                          <div
                            className="heatmap-cell"
                            style={{
                              backgroundColor: `rgba(245, 158, 11, ${0.3 + intensity * 0.7})`,
                              color: intensity > 0.5 ? 'white' : '#1f2937',
                            }}
                            title={`조퇴률: ${period.earlyLeaveRate.toFixed(1)}%`}
                          >
                            {period.earlyLeaveRate.toFixed(1)}%
                          </div>
                          <div
                            className="heatmap-cell"
                            style={{
                              backgroundColor: `rgba(59, 130, 246, ${0.3 + intensity * 0.7})`,
                              color: intensity > 0.5 ? 'white' : '#1f2937',
                            }}
                            title={`양호실 방문률: ${period.healthVisitRate.toFixed(1)}%`}
                          >
                            {period.healthVisitRate.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {selectedReport.patternAnalysis.insights.concentrationPeriod && (
                  <div className="pattern-insight">
                    <Info size={16} />
                    <span>
                      <strong>{selectedReport.patternAnalysis.insights.concentrationPeriod}교시</strong>에 결석 및 조퇴가 가장 많습니다.
                      {selectedReport.patternAnalysis.insights.concentrationPeriod === 5 ? ' 점심시간 직후인 5교시에 수업 분위기 환기를 요청드릴 수 있습니다.' : ' 해당 교시 담당 선생님께 수업 분위기 점검을 요청드릴 수 있습니다.'}
                    </span>
                  </div>
                )}
                {selectedReport.patternAnalysis.insights.healthIssuePeriod && (
                  <div className="pattern-insight">
                    <Info size={16} />
                    <span>
                      <strong>{selectedReport.patternAnalysis.insights.healthIssuePeriod}교시</strong>에 양호실 방문이 타 교시 대비 높습니다.
                      {selectedReport.patternAnalysis.insights.healthIssuePeriod === 5 ? ' 점심시간 직후 건강 관리가 필요할 수 있습니다.' : ' 해당 시간대 건강 상태 점검이 필요합니다.'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 홈스쿨링 및 장기 결석자 관리 */}
          {selectedReport.homeSchoolAlerts && selectedReport.homeSchoolAlerts.length > 0 && (
            <div className="home-school-section">
              <h3>
                <Home size={20} />
                홈스쿨링 및 장기 결석자 관리
              </h3>
              <div className="home-school-alerts-list">
                {selectedReport.homeSchoolAlerts.map((alert, index) => (
                  <div
                    key={`${alert.studentId}-${index}`}
                    className={`home-school-alert alert-${alert.type} risk-${alert.riskLevel || 'low'}`}
                  >
                    <div className="alert-header">
                      {alert.type === 'home_school_return' ? (
                        <Home size={18} />
                      ) : (
                        <UserX size={18} />
                      )}
                      <div className="alert-student">
                        <strong>{alert.studentName}</strong>
                        <span className="student-class">{alert.grade}학년 {alert.class}반</span>
                      </div>
                      {alert.riskLevel && (
                        <div className={`risk-badge risk-${alert.riskLevel}`}>
                          {alert.riskLevel === 'high' ? '높음' : alert.riskLevel === 'medium' ? '보통' : '낮음'}
                        </div>
                      )}
                    </div>
                    <div className="alert-content">
                      <p className="alert-message">{alert.message}</p>
                      {alert.type === 'home_school_return' && alert.daysRemaining !== undefined && (
                        <div className="alert-details">
                          <p>
                            <strong>복귀 예정:</strong> {alert.daysRemaining}일 후
                          </p>
                          <p className="alert-action">
                            다음 주 월요일 복귀 예정이니, 급식 신청 및 기숙사 침구류 세팅 여부를 미리 확인해주세요.
                          </p>
                        </div>
                      )}
                      {alert.type === 'absent_warning' && alert.attendanceRate !== undefined && (
                        <div className="alert-details">
                          <p>
                            <strong>현재 출석률:</strong> {alert.attendanceRate.toFixed(1)}%
                          </p>
                          <p>
                            <strong>수료 기준:</strong> {alert.requiredAttendanceRate?.toFixed(1)}% 이상
                          </p>
                          {alert.absentDays !== undefined && (
                            <p>
                              <strong>결석 일수:</strong> {alert.absentDays}일
                            </p>
                          )}
                          <p className="alert-action">
                            수료 기준(2/3 이상)까지 앞으로 {alert.attendanceRate < alert.requiredAttendanceRate! ? 
                              `${Math.ceil((alert.requiredAttendanceRate! - alert.attendanceRate) / 100 * 100)}일 이상` : 
                              '추가'} 결석 시 유급 위험이 있으니 학부모 면담이 필수적입니다.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI 인사이트 */}
          {selectedReport.insights.length > 0 && (
            <div className="insights-section">
              <h3>AI 인사이트</h3>
              <div className="insights-list">
                {selectedReport.insights.map((insight, index) => (
                  <div
                    key={index}
                    className={`insight-card insight-${insight.type}`}
                    style={{ borderLeftColor: getInsightColor(insight.type) }}
                  >
                    <div className="insight-icon" style={{ color: getInsightColor(insight.type) }}>
                      {getInsightIcon(insight.type)}
                    </div>
                    <div className="insight-content">
                      <p className="insight-message">{insight.message}</p>
                      {insight.change !== undefined && (
                        <div className="insight-change">
                          {insight.change > 0 ? (
                            <span className="change-up">
                              <TrendingUp size={14} />
                              {Math.abs(insight.change)}%p 증가
                            </span>
                          ) : (
                            <span className="change-down">
                              <TrendingDown size={14} />
                              {Math.abs(insight.change)}%p 감소
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 필터 */}
          <div className="report-filters">
            <label>학년:</label>
            <select
              value={selectedGrade || ''}
              onChange={(e) => setSelectedGrade(e.target.value ? Number(e.target.value) as Grade : null)}
              className="filter-select"
            >
              <option value="">전체</option>
              <option value="1">1학년</option>
              <option value="2">2학년</option>
              <option value="3">3학년</option>
            </select>
            <label>반:</label>
            <select
              value={selectedClass || ''}
              onChange={(e) => setSelectedClass(e.target.value ? Number(e.target.value) as Class : null)}
              className="filter-select"
            >
              <option value="">전체</option>
              {[1, 2, 3, 4, 5, 6].map(num => (
                <option key={num} value={num}>{num}반</option>
              ))}
            </select>
          </div>

          {/* 학년별 통계 */}
          <div className="stats-section">
            <h3>학년별 통계</h3>
            <div className="grade-stats-grid">
              {Object.entries(selectedReport.gradeStats).map(([grade, stats]) => (
                <div key={grade} className="stat-card">
                  <h4>{stats.grade}학년</h4>
                  <div className="stat-metrics">
                    <div className="metric">
                      <span className="metric-label">출석률</span>
                      <span className="metric-value">{stats.attendanceRate.toFixed(1)}%</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">지각률</span>
                      <span className="metric-value warning">{stats.lateRate.toFixed(1)}%</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">결석률</span>
                      <span className="metric-value warning">{stats.absentRate.toFixed(1)}%</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">학생 수</span>
                      <span className="metric-value">{stats.totalStudents}명</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 반별 통계 */}
          <div className="stats-section">
            <h3>반별 통계</h3>
            <div className="class-stats-table">
              <table>
                <thead>
                  <tr>
                    <th>학년/반</th>
                    <th>학생 수</th>
                    <th>출석률</th>
                    <th>지각률</th>
                    <th>결석률</th>
                    <th>전주 대비</th>
                    <th>전월 대비</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClassStats.map(([key, stats]) => (
                    <tr key={key}>
                      <td className="class-name">{stats.grade}학년 {stats.class}반</td>
                      <td>{stats.totalStudents}명</td>
                      <td>
                        <span className={`rate ${stats.attendanceRate >= 95 ? 'good' : stats.attendanceRate >= 90 ? 'normal' : 'bad'}`}>
                          {stats.attendanceRate.toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <span className={`rate ${stats.lateRate <= 5 ? 'good' : stats.lateRate <= 10 ? 'normal' : 'bad'}`}>
                          {stats.lateRate.toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <span className={`rate ${stats.absentRate <= 2 ? 'good' : stats.absentRate <= 5 ? 'normal' : 'bad'}`}>
                          {stats.absentRate.toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        {stats.previousWeekStats ? (
                          <div className="comparison">
                            {stats.lateRate > stats.previousWeekStats.lateRate ? (
                              <span className="change-up">
                                <TrendingUp size={12} />
                                {(stats.lateRate - stats.previousWeekStats.lateRate).toFixed(1)}%p
                              </span>
                            ) : stats.lateRate < stats.previousWeekStats.lateRate ? (
                              <span className="change-down">
                                <TrendingDown size={12} />
                                {(stats.previousWeekStats.lateRate - stats.lateRate).toFixed(1)}%p
                              </span>
                            ) : (
                              <span className="change-neutral">-</span>
                            )}
                          </div>
                        ) : (
                          <span className="no-data">-</span>
                        )}
                      </td>
                      <td>
                        {stats.previousMonthStats ? (
                          <div className="comparison">
                            {stats.lateRate > stats.previousMonthStats.lateRate ? (
                              <span className="change-up">
                                <TrendingUp size={12} />
                                {(stats.lateRate - stats.previousMonthStats.lateRate).toFixed(1)}%p
                              </span>
                            ) : stats.lateRate < stats.previousMonthStats.lateRate ? (
                              <span className="change-down">
                                <TrendingDown size={12} />
                                {(stats.previousMonthStats.lateRate - stats.lateRate).toFixed(1)}%p
                              </span>
                            ) : (
                              <span className="change-neutral">-</span>
                            )}
                          </div>
                        ) : (
                          <span className="no-data">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {reports.length === 0 && (
        <div className="empty-state">
          <FileText size={48} />
          <h3>리포트가 없습니다</h3>
          <p>이번 주 리포트를 생성하여 지난주 출석 현황을 확인하세요.</p>
          <button onClick={handleGenerateReport} className="generate-btn">
            <Calendar size={18} />
            <span>리포트 생성</span>
          </button>
        </div>
      )}
    </div>
  );
}

