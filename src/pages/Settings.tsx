import { useState, useEffect } from 'react';
import { format, parseISO, getYear } from 'date-fns';
import { Plus, Trash2, Edit2, Calendar } from 'lucide-react';
import { configStorage, semesterScheduleStorage, holidayStorage, sessionStorage, attendanceStorage } from '../utils/storage';
import { sortSchedules } from '../utils/semester';
import { getDayTypeLabel } from '../utils/dayType';
import { getKoreanHolidaysForYears, getHolidayName } from '../utils/koreanHolidays';
import { getActiveSession, sortSessions } from '../utils/session';
import { switchSession, createAndActivateSession, deleteSession } from '../utils/sessionManager';
import { getCurrentUser, canEditSettings } from '../utils/auth-supabase';
import type { AttendanceConfig, Period, SemesterSchedule, PeriodSchedule, DayType, Session, User } from '../types';
import './Settings.css';

export default function Settings() {
  const [semester, setSemester] = useState<'1학기' | '2학기' | '여름방학' | '겨울방학'>('1학기');
  const [grade, setGrade] = useState<1 | 2 | 3>(1);
  const [classNum, setClassNum] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [periodSchedules, setPeriodSchedules] = useState<PeriodSchedule[]>([]);
  const [selectedDayType, setSelectedDayType] = useState<DayType>('weekday');
  const [savedMessage, setSavedMessage] = useState('');
  const [schedules, setSchedules] = useState<SemesterSchedule[]>([]);
  const [editingSchedule, setEditingSchedule] = useState<SemesterSchedule | null>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [newHoliday, setNewHoliday] = useState('');
  const [_sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [_showSessionForm, setShowSessionForm] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    loadUser();
  }, []);
  const canEdit = canEditSettings(currentUser);

  useEffect(() => {
    loadSessions();
    loadSchedules();
    loadHolidays();
  }, []);

  // activeSession이 로드된 후 설정 로드
  useEffect(() => {
    if (activeSession) {
      loadConfig();
    }
  }, [activeSession]);

  const loadSessions = () => {
    const loadedSessions = sessionStorage.load();
    const sorted = sortSessions(loadedSessions);
    setSessions(sorted);
    const active = getActiveSession(sorted);
    setActiveSession(active);
  };

  // periodSchedules가 비어있으면 초기화
  useEffect(() => {
    if (periodSchedules.length === 0) {
      initializeDefaultPeriodSchedules();
    }
  }, [periodSchedules.length]);

  const loadSchedules = () => {
    const loadedSchedules = semesterScheduleStorage.load();
    setSchedules(sortSchedules(loadedSchedules));
  };

  const loadHolidays = () => {
    setHolidays(holidayStorage.load());
  };

  const loadConfig = () => {
    if (!activeSession) return;
    
    const config = configStorage.load(activeSession.id);
    if (config) {
      // 기존 설정이 있으면 semester, grade, class 유지
      setSemester(config.semester);
      setGrade(config.grade);
      setClassNum(config.class);
      
      if (config.periodSchedules && config.periodSchedules.length > 0) {
        // 학년별 설정 제거 (grade 필드가 있는 항목 제거)
        const cleanedSchedules = config.periodSchedules
          .filter(ps => !ps.grade)
          .map(ps => {
            // grade 필드 제거
            const { grade, ...rest } = ps;
            return rest;
          });
        
        // 각 dayType별로 하나만 유지 (없으면 기본값 생성)
        const dayTypes: DayType[] = ['weekday', 'weekend', 'holiday', 'vacation'];
        const finalSchedules: PeriodSchedule[] = dayTypes.map(dayType => {
          const existing = cleanedSchedules.find(ps => ps.dayType === dayType);
          if (existing) {
            return existing;
          }
          // 기본값 생성
          const defaultPeriods: Period[] = [
            { period: 1, startTime: '08:30', endTime: '09:20' },
            { period: 2, startTime: '09:30', endTime: '10:20' },
            { period: 3, startTime: '10:30', endTime: '11:20' },
            { period: 4, startTime: '11:30', endTime: '12:20' },
            { period: 5, startTime: '13:20', endTime: '14:10' },
            { period: 6, startTime: '14:20', endTime: '15:10' },
            { period: 7, startTime: '15:20', endTime: '16:10' },
            { period: 8, startTime: '16:20', endTime: '17:10' },
            { period: 9, startTime: '19:00', endTime: '19:50' },
            { period: 10, startTime: '20:00', endTime: '20:50' },
            { period: 11, startTime: '21:00', endTime: '21:50' },
            { period: 12, startTime: '22:00', endTime: '22:50' },
          ];
          const maxPeriod = Math.max(...defaultPeriods.map(p => p.period));
          const defaultEndPeriod = dayType === 'weekend' ? 8 : dayType === 'holiday' ? 6 : dayType === 'vacation' ? 4 : maxPeriod;
          return {
            dayType,
            periods: defaultPeriods,
            startPeriod: 1,
            endPeriod: defaultEndPeriod,
          };
        });
        
        setPeriodSchedules(finalSchedules);
        
        // 정리된 설정 저장
        if (activeSession) {
          const cleanedConfig: AttendanceConfig = {
            ...config,
            periodSchedules: finalSchedules,
          };
          configStorage.save(cleanedConfig, activeSession.id);
        }
      } else if (config.defaultPeriods) {
        // 기존 데이터 마이그레이션
        const maxPeriod = Math.max(...config.defaultPeriods.map(p => p.period));
        const migrated: PeriodSchedule[] = [
          { dayType: 'weekday', periods: config.defaultPeriods, startPeriod: 1, endPeriod: maxPeriod },
          { dayType: 'weekend', periods: config.defaultPeriods, startPeriod: 1, endPeriod: 8 },
          { dayType: 'holiday', periods: config.defaultPeriods, startPeriod: 1, endPeriod: 6 },
          { dayType: 'vacation', periods: config.defaultPeriods, startPeriod: 1, endPeriod: 4 },
        ];
        setPeriodSchedules(migrated);
      } else {
        initializeDefaultPeriodSchedules();
      }
    } else {
      initializeDefaultPeriodSchedules();
    }
  };

  const initializeDefaultPeriodSchedules = () => {
    const defaultPeriods: Period[] = [
      { period: 1, startTime: '08:30', endTime: '09:20' },
      { period: 2, startTime: '09:30', endTime: '10:20' },
      { period: 3, startTime: '10:30', endTime: '11:20' },
      { period: 4, startTime: '11:30', endTime: '12:20' },
      { period: 5, startTime: '13:20', endTime: '14:10' },
      { period: 6, startTime: '14:20', endTime: '15:10' },
      { period: 7, startTime: '15:20', endTime: '16:10' },
      { period: 8, startTime: '16:20', endTime: '17:10' },
      { period: 9, startTime: '19:00', endTime: '19:50' },
      { period: 10, startTime: '20:00', endTime: '20:50' },
      { period: 11, startTime: '21:00', endTime: '21:50' },
      { period: 12, startTime: '22:00', endTime: '22:50' },
    ];
    
    const maxPeriod = Math.max(...defaultPeriods.map(p => p.period));
    
    setPeriodSchedules([
      { dayType: 'weekday', periods: [...defaultPeriods], startPeriod: 1, endPeriod: maxPeriod },
      { dayType: 'weekend', periods: [...defaultPeriods], startPeriod: 1, endPeriod: 8 },
      { dayType: 'holiday', periods: [...defaultPeriods], startPeriod: 1, endPeriod: 6 },
      { dayType: 'vacation', periods: [...defaultPeriods], startPeriod: 1, endPeriod: 4 },
    ]);
  };

  const getCurrentPeriods = (): Period[] => {
    const schedule = periodSchedules.find(ps => ps.dayType === selectedDayType);
    if (!schedule) return [];
    
    const periods = schedule.periods;
    const startPeriod = schedule.startPeriod ?? 1;
    const endPeriod = schedule.endPeriod ?? Math.max(...periods.map(p => p.period));
    
    // 교시 범위에 맞게 필터링
    return periods.filter(p => p.period >= startPeriod && p.period <= endPeriod);
  };

  const getCurrentSchedule = (): PeriodSchedule | undefined => {
    return periodSchedules.find(ps => ps.dayType === selectedDayType && !ps.grade);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // @ts-ignore
  const _getSchedulesForDayType = (): PeriodSchedule[] => {
    return periodSchedules.filter(ps => ps.dayType === selectedDayType);
  };

  const updatePeriodRange = (field: 'startPeriod' | 'endPeriod', value: number) => {
    const updated = periodSchedules.map(ps => {
      if (ps.dayType === selectedDayType && !ps.grade) {
        return { ...ps, [field]: value };
      }
      return ps;
    });
    
    setPeriodSchedules(updated);
    // 자동 저장 제거 - 저장 버튼으로 명시적 저장
  };

  const updatePeriodTime = (period: number, field: 'startTime' | 'endTime', value: string) => {
    const updated = periodSchedules.map(ps => {
      if (ps.dayType === selectedDayType) {
        return {
          ...ps,
          periods: ps.periods.map(p => 
            p.period === period ? { ...p, [field]: value } : p
          ),
        };
      }
      return ps;
    });
    setPeriodSchedules(updated);
    // 자동 저장 제거 - 저장 버튼으로 명시적 저장
  };

  const savePeriodTimes = () => {
    if (!canEdit) {
      setSavedMessage('설정을 수정할 권한이 없습니다.');
      setTimeout(() => setSavedMessage(''), 3000);
      return;
    }

    if (!activeSession) {
      setSavedMessage('활성 세션이 없습니다.');
      setTimeout(() => setSavedMessage(''), 3000);
      return;
    }

    const config: AttendanceConfig = {
      semester,
      grade,
      class: classNum,
      dayPeriodRanges: [],
      periodSchedules,
      sessionId: activeSession.id,
    };
    
    try {
      configStorage.save(config, activeSession.id);
      
      // 저장된 데이터 확인을 위해 다시 로드
      const savedConfig = configStorage.load(activeSession.id);
      if (savedConfig && savedConfig.periodSchedules) {
        setPeriodSchedules(savedConfig.periodSchedules);
      }
      
      // 설정 변경 이벤트 발생 (출석부에 동기화)
      window.dispatchEvent(new CustomEvent('attendanceConfigUpdated', { 
        detail: { 
          sessionId: activeSession.id,
          config: savedConfig || config
        } 
      }));
      
      setSavedMessage('교시 시간표가 저장되었습니다. 출석부에 반영되었습니다.');
      setTimeout(() => setSavedMessage(''), 3000);
    } catch (error) {
      console.error('저장 오류:', error);
      setSavedMessage('저장 중 오류가 발생했습니다.');
      setTimeout(() => setSavedMessage(''), 3000);
    }
  };


  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // @ts-ignore
  const _deletePeriod = (period: number) => {
    if (confirm(`${period}교시를 삭제하시겠습니까?`)) {
      const updated = periodSchedules.map(ps => {
        if (ps.dayType === selectedDayType) {
          return {
            ...ps,
            periods: ps.periods.filter(p => p.period !== period),
          };
        }
        return ps;
      });
      setPeriodSchedules(updated);
      
      // 자동 저장
      if (canEdit && activeSession) {
        const config: AttendanceConfig = {
          semester,
          grade,
          class: classNum,
          dayPeriodRanges: [],
          periodSchedules: updated,
          sessionId: activeSession.id,
        };
        configStorage.save(config, activeSession.id);
        
        // 설정 변경 이벤트 발생
        window.dispatchEvent(new CustomEvent('attendanceConfigUpdated', { 
          detail: { sessionId: activeSession.id } 
        }));
      }
      
      setSavedMessage(`${period}교시가 삭제되었습니다.`);
      setTimeout(() => setSavedMessage(''), 3000);
    }
  };

  const addHoliday = () => {
    if (newHoliday && !holidays.includes(newHoliday)) {
      const updated = [...holidays, newHoliday].sort();
      setHolidays(updated);
      holidayStorage.save(updated);
      
      // 휴일 변경 이벤트 발생
      window.dispatchEvent(new CustomEvent('holidaysUpdated'));
      
      setNewHoliday('');
      setSavedMessage('휴일이 추가되었습니다.');
      setTimeout(() => setSavedMessage(''), 3000);
    }
  };

  const removeHoliday = (date: string) => {
    const updated = holidays.filter(h => h !== date);
    setHolidays(updated);
    holidayStorage.save(updated);
    
    // 휴일 변경 이벤트 발생
    window.dispatchEvent(new CustomEvent('holidaysUpdated'));
    
    setSavedMessage('휴일이 삭제되었습니다.');
    setTimeout(() => setSavedMessage(''), 3000);
  };

  const autoSetKoreanHolidays = () => {
    const currentYear = getYear(new Date());
    const startYear = currentYear; // 올해부터
    const endYear = currentYear + 1; // 내년까지
    
    const koreanHolidays = getKoreanHolidaysForYears(startYear, endYear);
    
    // 기존 휴일과 병합 (중복 제거)
    const existingHolidays = new Set(holidays);
    koreanHolidays.forEach(holiday => existingHolidays.add(holiday));
    
    const updated = Array.from(existingHolidays).sort();
    setHolidays(updated);
    holidayStorage.save(updated);
    
    // 휴일 변경 이벤트 발생
    window.dispatchEvent(new CustomEvent('holidaysUpdated'));
    
    setSavedMessage(`한국 공휴일 ${koreanHolidays.length}개가 자동으로 추가되었습니다.`);
    setTimeout(() => setSavedMessage(''), 5000);
  };


  const handleAddSchedule = (schedule: Omit<SemesterSchedule, 'id'>) => {
    if (!canEdit) {
      setSavedMessage('일정을 추가할 권한이 없습니다.');
      setTimeout(() => setSavedMessage(''), 3000);
      return;
    }
    const newId = `${schedule.year}-${schedule.type}-${Date.now()}`;
    const newSchedule: SemesterSchedule = {
      ...schedule,
      id: newId,
    };
    const updated = [...schedules, newSchedule];
    setSchedules(sortSchedules(updated));
    // 저장은 saveSchedules 함수에서 처리
    setShowScheduleForm(false);
  };

  const handleUpdateSchedule = (schedule: SemesterSchedule | Omit<SemesterSchedule, 'id'>) => {
    if (!editingSchedule) return;
    const updated: SemesterSchedule = { ...editingSchedule, ...schedule };
    if (!canEdit) {
      setSavedMessage('일정을 수정할 권한이 없습니다.');
      setTimeout(() => setSavedMessage(''), 3000);
      return;
    }
    const index = schedules.findIndex(s => s.id === updated.id);
    if (index >= 0) {
      const updatedSchedules = [...schedules];
      updatedSchedules[index] = updated;
      setSchedules(sortSchedules(updatedSchedules));
      // 저장은 saveSchedules 함수에서 처리
      setEditingSchedule(null);
    }
  };

  const saveSchedules = () => {
    if (!canEdit) {
      setSavedMessage('설정을 수정할 권한이 없습니다.');
      setTimeout(() => setSavedMessage(''), 3000);
      return;
    }

    semesterScheduleStorage.save(schedules);
    
    // 학기 일정 변경 이벤트 발생
    window.dispatchEvent(new CustomEvent('semesterScheduleUpdated'));
    
    setSavedMessage('학기/방학 일정이 저장되었습니다.');
    setTimeout(() => setSavedMessage(''), 3000);
  };

  const handleDeleteSchedule = (id: string) => {
    if (!canEdit) {
      setSavedMessage('일정을 삭제할 권한이 없습니다.');
      setTimeout(() => setSavedMessage(''), 3000);
      return;
    }
    if (confirm('이 학기/방학 일정을 삭제하시겠습니까?')) {
      const updated = schedules.filter(s => s.id !== id);
      setSchedules(updated);
      // 저장은 saveSchedules 함수에서 처리
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // @ts-ignore
  const _handleSwitchSession = async (sessionId: string) => {
    if (activeSession && activeSession.id === sessionId) {
      setSavedMessage('이미 활성화된 세션입니다.');
      setTimeout(() => setSavedMessage(''), 3000);
      return;
    }

    if (confirm('세션을 전환하면 현재 세션의 데이터가 아카이빙됩니다. 계속하시겠습니까?')) {
      try {
        const currentRecords = attendanceStorage.load(activeSession?.id);
        const currentConfig = configStorage.load(activeSession?.id);
        
        await switchSession(sessionId, currentRecords, currentConfig);
        loadSessions();
        loadConfig(); // 새 세션의 설정 로드
        
        // 세션 변경 이벤트 발생
        window.dispatchEvent(new CustomEvent('sessionUpdated', { 
          detail: { sessionId } 
        }));
        
        setSavedMessage('세션이 전환되었습니다.');
        setTimeout(() => setSavedMessage(''), 3000);
      } catch (error) {
        setSavedMessage(`오류: ${error instanceof Error ? error.message : '세션 전환에 실패했습니다.'}`);
        setTimeout(() => setSavedMessage(''), 5000);
      }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // @ts-ignore
  const _handleCreateSession = (name: string, type: '1학기' | '2학기' | '여름방학' | '겨울방학', startDate: string, endDate: string, year: number) => {
    if (!canEdit) {
      setSavedMessage('세션을 생성할 권한이 없습니다.');
      setTimeout(() => setSavedMessage(''), 3000);
      return;
    }
    const newSession = createAndActivateSession(name, type, startDate, endDate, year);
    loadSessions();
    
    // 세션 변경 이벤트 발생
    window.dispatchEvent(new CustomEvent('sessionUpdated', { 
      detail: { sessionId: newSession.id } 
    }));
    
    setShowSessionForm(false);
    setSavedMessage(`새 세션 "${newSession.name}"이 생성되고 활성화되었습니다.`);
    setTimeout(() => setSavedMessage(''), 3000);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // @ts-ignore
  const _handleDeleteSession = (sessionId: string) => {
    if (!canEdit) {
      setSavedMessage('세션을 삭제할 권한이 없습니다.');
      setTimeout(() => setSavedMessage(''), 3000);
      return;
    }
    if (activeSession && activeSession.id === sessionId) {
      setSavedMessage('활성 세션은 삭제할 수 없습니다. 먼저 다른 세션으로 전환해주세요.');
      setTimeout(() => setSavedMessage(''), 3000);
      return;
    }

    if (confirm('이 세션과 모든 아카이빙된 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      deleteSession(sessionId);
      loadSessions();
      
      // 세션 변경 이벤트 발생
      window.dispatchEvent(new CustomEvent('sessionUpdated'));
      
      setSavedMessage('세션이 삭제되었습니다.');
      setTimeout(() => setSavedMessage(''), 3000);
    }
  };

  return (
    <div className="settings">
      <div className="settings-header">
        <h2>출석부 설정</h2>
        {savedMessage && <div className="saved-message">{savedMessage}</div>}
      </div>

      <div className="settings-section">
        <div className="section-header">
          <h3>학기/방학 일정 관리</h3>
          <div className="section-header-actions">
            {canEdit && (
              <button onClick={() => setShowScheduleForm(true)} className="add-schedule-btn">
                <Plus size={18} />
                <span>일정 추가</span>
              </button>
            )}
            {canEdit && schedules.length > 0 && (
              <button onClick={saveSchedules} className="save-section-btn">
                저장
              </button>
            )}
          </div>
        </div>
        <p className="section-description">학기와 방학의 시작일과 종료일을 설정합니다. 출석부에서 날짜에 맞는 학기/방학이 자동으로 선택됩니다.</p>
        
        {schedules.length > 0 ? (
          <div className="schedules-table">
            <table>
              <thead>
                <tr>
                  <th>이름</th>
                  <th>타입</th>
                  <th>연도</th>
                  <th>시작일</th>
                  <th>종료일</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map(schedule => (
                  <tr key={schedule.id}>
                    <td>{schedule.name}</td>
                    <td>{schedule.type}</td>
                    <td>{schedule.year}년</td>
                    <td>{format(parseISO(schedule.startDate), 'yyyy-MM-dd')}</td>
                    <td>{format(parseISO(schedule.endDate), 'yyyy-MM-dd')}</td>
                    {canEdit && (
                      <td>
                        <div className="schedule-actions">
                          <button
                            onClick={() => setEditingSchedule(schedule)}
                            className="edit-btn-small"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="delete-btn-small"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>등록된 학기/방학 일정이 없습니다. 일정을 추가해주세요.</p>
          </div>
        )}
      </div>

      {showScheduleForm && (
        <ScheduleForm
          onSave={handleAddSchedule}
          onCancel={() => setShowScheduleForm(false)}
        />
      )}

      {editingSchedule && (
        <ScheduleForm
          schedule={editingSchedule}
          onSave={handleUpdateSchedule}
          onCancel={() => setEditingSchedule(null)}
        />
      )}

      <div className="settings-section period-settings-section">
        <div className="period-settings-title">
          <div className="section-header-with-button">
            <h3>교시별 시간 설정</h3>
            {canEdit && (
              <button onClick={savePeriodTimes} className="save-section-btn">
                전체 저장
              </button>
            )}
          </div>
          <p className="section-description">날짜 유형별로 각 교시의 시작 시간과 종료 시간, 그리고 교시 범위를 설정합니다.</p>
        </div>
        
        <div className="day-type-selector">
          {(['weekday', 'weekend', 'holiday', 'vacation'] as DayType[]).map(dayType => (
            <button
              key={dayType}
              onClick={() => setSelectedDayType(dayType)}
              className={`day-type-card ${selectedDayType === dayType ? 'active' : ''}`}
            >
              <div className="day-type-icon"></div>
              <span>{getDayTypeLabel(dayType)}</span>
            </button>
          ))}
        </div>

        <div className="period-config-container">
          <div className="period-range-section">
            <div className="section-label">
              <span>교시 범위</span>
            </div>
            <div className="period-range-controls">
              {(() => {
                const schedule = getCurrentSchedule();
                if (!schedule) return null;
                
                const allPeriods = schedule.periods;
                const maxPeriod = allPeriods.length > 0 ? Math.max(...allPeriods.map(p => p.period)) : 12;
                const startPeriod = schedule.startPeriod ?? 1;
                const endPeriod = schedule.endPeriod ?? maxPeriod;
                
                return (
                  <div className="range-inputs">
                    <div className="range-input-wrapper">
                      <label>시작 교시</label>
                      <input
                        type="number"
                        min="1"
                        max={maxPeriod}
                        value={startPeriod}
                        onChange={(e) => updatePeriodRange('startPeriod', Number(e.target.value))}
                        className="range-input"
                      />
                    </div>
                    <span className="range-arrow">→</span>
                    <div className="range-input-wrapper">
                      <label>종료 교시</label>
                      <input
                        type="number"
                        min={startPeriod}
                        max={maxPeriod}
                        value={endPeriod}
                        onChange={(e) => updatePeriodRange('endPeriod', Number(e.target.value))}
                        className="range-input"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="period-times-section">
            <div className="section-label">
              <span>교시 시간표</span>
            </div>
            <div className="period-list">
              {getCurrentPeriods().map(p => {
                const start = new Date(`2000-01-01T${p.startTime}`);
                const end = new Date(`2000-01-01T${p.endTime}`);
                const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
                
                return (
                  <div key={p.period} className="period-card">
                    <div className="period-card-header">
                      <div className="period-badge">{p.period}</div>
                      <div className="period-duration-badge">{duration}분</div>
                    </div>
                    <div className="period-time-inputs">
                      <div className="time-input-group">
                        <label>시작</label>
                        <input
                          type="time"
                          value={p.startTime}
                          onChange={(e) => updatePeriodTime(p.period, 'startTime', e.target.value)}
                          className="time-input-modern"
                        />
                      </div>
                      <div className="time-separator">-</div>
                      <div className="time-input-group">
                        <label>종료</label>
                        <input
                          type="time"
                          value={p.endTime}
                          onChange={(e) => updatePeriodTime(p.period, 'endTime', e.target.value)}
                          className="time-input-modern"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>휴일 관리</h3>
        <p className="section-description">공휴일을 추가하면 해당 날짜는 휴일 시간표가 적용됩니다.</p>
        
        <div className="holiday-auto-section">
          <button onClick={autoSetKoreanHolidays} className="auto-holiday-btn">
            <Calendar size={18} />
            <span>한국 공휴일 자동 설정</span>
          </button>
          <p className="auto-holiday-hint">
            올해부터 내년까지의 한국 공휴일을 자동으로 추가합니다. (고정 공휴일 + 대체공휴일)
          </p>
        </div>
        
        <div className="holiday-input-section">
          <input
            type="date"
            value={newHoliday}
            onChange={(e) => setNewHoliday(e.target.value)}
            className="holiday-input"
          />
          <button onClick={addHoliday} className="add-holiday-btn">
            <Plus size={18} />
            <span>휴일 추가</span>
          </button>
        </div>

        {holidays.length > 0 && (
          <div className="holidays-list">
            <h4>등록된 휴일</h4>
            <div className="holidays-grid">
              {holidays.map(holiday => (
                <div key={holiday} className="holiday-item">
                  <div className="holiday-info">
                    <span className="holiday-date">{format(parseISO(holiday), 'yyyy년 MM월 dd일')}</span>
                    <span className="holiday-name">{getHolidayName(holiday)}</span>
                  </div>
                  <button
                    onClick={() => removeHoliday(holiday)}
                    className="remove-holiday-btn"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ScheduleFormProps {
  schedule?: SemesterSchedule;
  onSave: (schedule: SemesterSchedule | Omit<SemesterSchedule, 'id'>) => void;
  onCancel: () => void;
}

interface SessionFormProps {
  onSave: (name: string, type: '1학기' | '2학기' | '여름방학' | '겨울방학', startDate: string, endDate: string, year: number) => void;
  onCancel: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// @ts-ignore
function _SessionForm({ onSave, onCancel }: SessionFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: '1학기' as '1학기' | '2학기' | '여름방학' | '겨울방학',
    startDate: '',
    endDate: '',
    year: getYear(new Date()),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData.name, formData.type, formData.startDate, formData.endDate, formData.year);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>세션 추가</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>세션 이름</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="예: 2024년 1학기"
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>타입</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as '1학기' | '2학기' | '여름방학' | '겨울방학' })}
              >
                <option value="1학기">1학기</option>
                <option value="여름방학">여름방학</option>
                <option value="2학기">2학기</option>
                <option value="겨울방학">겨울방학</option>
              </select>
            </div>
            <div className="form-group">
              <label>연도</label>
              <input
                type="number"
                min="2020"
                max="2100"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>시작일</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>종료일</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="save-btn">저장</button>
            <button type="button" onClick={onCancel} className="cancel-btn">취소</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ScheduleForm({ schedule, onSave, onCancel }: ScheduleFormProps) {
  const [formData, setFormData] = useState({
    name: schedule?.name || '',
    type: schedule?.type || '1학기' as SemesterSchedule['type'],
    startDate: schedule?.startDate || '',
    endDate: schedule?.endDate || '',
    year: schedule?.year || new Date().getFullYear(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }
    
    if (!formData.startDate || !formData.endDate) {
      alert('시작일과 종료일을 입력해주세요.');
      return;
    }
    
    if (formData.startDate > formData.endDate) {
      alert('시작일이 종료일보다 늦을 수 없습니다.');
      return;
    }

    if (schedule) {
      onSave({ ...schedule, ...formData });
    } else {
      onSave(formData);
    }
  };

  useEffect(() => {
    // 이름 자동 생성
    if (!schedule && formData.type && formData.year) {
      setFormData(prev => ({
        ...prev,
        name: `${formData.year}년 ${formData.type}`,
      }));
    }
  }, [formData.type, formData.year, schedule]);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{schedule ? '학기/방학 일정 수정' : '학기/방학 일정 추가'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>이름</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="예: 2024년 1학기"
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>타입</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as SemesterSchedule['type'] })}
              >
                <option value="1학기">1학기</option>
                <option value="2학기">2학기</option>
                <option value="여름방학">여름방학</option>
                <option value="겨울방학">겨울방학</option>
              </select>
            </div>
            <div className="form-group">
              <label>연도</label>
              <input
                type="number"
                min="2020"
                max="2100"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>시작일</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>종료일</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="save-btn">저장</button>
            <button type="button" onClick={onCancel} className="cancel-btn">취소</button>
          </div>
        </form>
      </div>
    </div>
  );
}

