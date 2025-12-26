import { format } from 'date-fns';
import type { PendingAttendance, AttendanceStatus } from '../types';
import { pendingAttendanceStorage, attendanceStorage, sessionStorage } from './storage';
import { getActiveSession, getSessionForDate } from './session';

/**
 * 임시 출석 체크 생성 (학생 반장)
 */
export const createPendingAttendance = (
  studentId: string,
  date: string,
  period: number,
  status: AttendanceStatus,
  checkedBy: string,
  note?: string
): PendingAttendance => {
  const pending: PendingAttendance = {
    id: `pending-${Date.now()}-${studentId}-${date}-${period}`,
    studentId,
    date,
    period,
    status,
    checkedBy,
    checkedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    note,
  };

  const allPending = pendingAttendanceStorage.load();
  allPending.push(pending);
  pendingAttendanceStorage.save(allPending);

  return pending;
};

/**
 * 임시 출석 승인 (교사)
 */
export const approvePendingAttendance = (
  pendingId: string,
  approvedBy: string
): boolean => {
  const allPending = pendingAttendanceStorage.load();
  const pending = allPending.find(p => p.id === pendingId);

  if (!pending) return false;

  // 활성 세션 확인
  const sessions = sessionStorage.load();
  const activeSession = getActiveSession(sessions);
  const currentSession = activeSession || getSessionForDate(pending.date, sessions);
  const sessionId = currentSession?.id;

  // 출석 기록에 추가
  const records = attendanceStorage.load(sessionId);
  const recordId = `${pending.studentId}-${pending.date}-${pending.period}`;
  
  // 기존 기록이 있으면 업데이트, 없으면 추가
  const existingIndex = records.findIndex(r => r.id === recordId);
  const newRecord = {
    id: recordId,
    studentId: pending.studentId,
    date: pending.date,
    period: pending.period,
    status: pending.status,
    sessionId,
  };

  if (existingIndex >= 0) {
    records[existingIndex] = newRecord;
  } else {
    records.push(newRecord);
  }

  attendanceStorage.save(records, sessionId);

  // 승인 처리
  pending.approvedBy = approvedBy;
  pending.approvedAt = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  pendingAttendanceStorage.save(allPending);

  return true;
};

/**
 * 임시 출석 거부 (교사)
 */
export const rejectPendingAttendance = (
  pendingId: string,
  rejectedBy: string
): boolean => {
  const allPending = pendingAttendanceStorage.load();
  const pending = allPending.find(p => p.id === pendingId);

  if (!pending) return false;

  pending.rejectedBy = rejectedBy;
  pending.rejectedAt = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  pendingAttendanceStorage.save(allPending);

  return true;
};

/**
 * 승인 대기 중인 출석 목록 가져오기
 */
export const getPendingAttendances = (userId?: string): PendingAttendance[] => {
  const allPending = pendingAttendanceStorage.load();
  
  if (userId) {
    // 특정 사용자가 체크한 것만
    return allPending.filter(p => p.checkedBy === userId && !p.approvedBy && !p.rejectedBy);
  }

  // 승인/거부되지 않은 모든 항목
  return allPending.filter(p => !p.approvedBy && !p.rejectedBy);
};

/**
 * 승인 대기 중인 출석 개수
 */
export const getPendingCount = (): number => {
  return getPendingAttendances().length;
};

