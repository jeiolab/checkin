import { sessionStorage, attendanceStorage, configStorage, archivedRecordsStorage, archivedConfigsStorage } from './storage';
import { getActiveSession, archiveSession, sortSessions, createSession } from './session';
import type { Session, AttendanceRecord, AttendanceConfig } from '../types';

/**
 * 세션 전환 및 아카이빙
 */
export const switchSession = async (
  newSessionId: string,
  currentRecords: AttendanceRecord[],
  currentConfig: AttendanceConfig | null
): Promise<void> => {
  const sessions = sessionStorage.load();
  const activeSession = getActiveSession(sessions);
  
  // 현재 활성 세션이 있으면 아카이빙
  if (activeSession && activeSession.id !== newSessionId) {
    // 현재 세션 아카이빙
    const archivedSession = archiveSession(activeSession);
    const updatedSessions = sessions.map(s => 
      s.id === activeSession.id ? archivedSession : s
    );
    
    // 현재 데이터를 아카이빙 저장
    if (currentRecords.length > 0) {
      archivedRecordsStorage.save(activeSession.id, currentRecords);
    }
    if (currentConfig) {
      archivedConfigsStorage.save(activeSession.id, currentConfig);
    }
    
    // 세션 저장소에서 제거 (아카이빙으로 이동)
    attendanceStorage.save([], activeSession.id);
    configStorage.save({} as AttendanceConfig, activeSession.id);
    
    // 세션 목록 업데이트
    sessionStorage.save(updatedSessions);
  }
  
  // 새 세션 활성화
  const newSessions = sessions.map(s => ({
    ...s,
    isActive: s.id === newSessionId,
  }));
  sessionStorage.save(newSessions);
};

/**
 * 세션 생성 및 활성화
 */
export const createAndActivateSession = (
  name: string,
  type: '1학기' | '2학기' | '여름방학' | '겨울방학',
  startDate: string,
  endDate: string,
  year: number
): Session => {
  const sessions = sessionStorage.load();
  const activeSession = getActiveSession(sessions);
  
  // 현재 활성 세션이 있으면 아카이빙
  if (activeSession) {
    const archivedSession = archiveSession(activeSession);
    const updatedSessions = sessions.map(s => 
      s.id === activeSession.id ? archivedSession : s
    );
    sessionStorage.save(updatedSessions);
  }
  
  // 새 세션 생성 및 활성화
  const newSession = createSession(name, type, startDate, endDate, year);
  const allSessions = sortSessions([...sessions.filter(s => s.id !== newSession.id), newSession]);
  sessionStorage.save(allSessions);
  
  return newSession;
};

/**
 * 아카이빙된 세션 데이터 복원
 */
export const restoreArchivedSession = (sessionId: string): {
  records: AttendanceRecord[];
  config: AttendanceConfig | null;
} => {
  const records = archivedRecordsStorage.load(sessionId);
  const config = archivedConfigsStorage.load(sessionId);
  
  return { records, config };
};

/**
 * 세션 삭제 (아카이빙 데이터 포함)
 */
export const deleteSession = (sessionId: string): void => {
  const sessions = sessionStorage.load();
  const updatedSessions = sessions.filter(s => s.id !== sessionId);
  sessionStorage.save(updatedSessions);
  
  // 아카이빙 데이터도 삭제
  const archivedRecordsKey = `neungju_archived_records_${sessionId}`;
  const archivedConfigsKey = `neungju_archived_configs_${sessionId}`;
  const recordsKey = `neungju_attendance_records_${sessionId}`;
  const configKey = `neungju_attendance_config_${sessionId}`;
  
  localStorage.removeItem(archivedRecordsKey);
  localStorage.removeItem(archivedConfigsKey);
  localStorage.removeItem(recordsKey);
  localStorage.removeItem(configKey);
};

