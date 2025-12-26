import { useState, useEffect, useRef, useMemo } from 'react';
import { Upload, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { studentStorage } from '../utils/storage';
import { parseExcelFile, downloadExcelTemplate } from '../utils/excel';
import { getCurrentUser, hasPermission } from '../utils/auth';
import type { Student, User } from '../types';
import './StudentManagement.css';

type SortField = 'grade' | 'class' | 'number' | 'name';
type SortDirection = 'asc' | 'desc';

export default function StudentManagement() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filterGrade, setFilterGrade] = useState<1 | 2 | 3 | null>(null);
  const [filterClass, setFilterClass] = useState<1 | 2 | 3 | 4 | 5 | 6 | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('grade');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    loadUser();
    loadStudents();
  }, []);

  const canEdit = currentUser && hasPermission(currentUser, 'edit_students');

  const loadStudents = () => {
    const allStudents = studentStorage.load();
    setStudents(allStudents);
  };

  const saveStudents = (updatedStudents: Student[]) => {
    setStudents(updatedStudents);
    studentStorage.save(updatedStudents);
  };

  // 필터링 및 검색
  const filteredStudents = useMemo(() => {
    let result = students.filter(s => {
      if (filterGrade && s.grade !== filterGrade) return false;
      if (filterClass && s.class !== filterClass) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = s.name.toLowerCase().includes(query);
        const numberMatch = s.number.toString().includes(query);
        const classMatch = `${s.grade}학년 ${s.class}반`.includes(query);
        if (!nameMatch && !numberMatch && !classMatch) return false;
      }
      return true;
    });

    // 정렬
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'grade':
          comparison = a.grade - b.grade;
          break;
        case 'class':
          comparison = a.class - b.class;
          break;
        case 'number':
          comparison = a.number - b.number;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name, 'ko');
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [students, filterGrade, filterClass, searchQuery, sortField, sortDirection]);

  // 페이지네이션
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filterGrade, filterClass, searchQuery]);

  const handleAddStudent = (studentData: Omit<Student, 'id'>) => {
    const newId = `${studentData.grade}-${studentData.class}-${studentData.number}`;
    const newStudent: Student = {
      ...studentData,
      id: newId,
    };
    saveStudents([...students, newStudent]);
    setShowAddForm(false);
  };

  const handleUpdateStudent = (student: Student | Omit<Student, 'id'>) => {
    if (!canEdit) {
      alert('학생 정보를 수정할 권한이 없습니다.');
      return;
    }
    if (!editingStudent) return;
    const updated: Student = { ...editingStudent, ...student };
    const index = students.findIndex(s => s.id === updated.id);
    if (index >= 0) {
      const updatedStudents = [...students];
      updatedStudents[index] = updated;
      saveStudents(updatedStudents);
    }
    setEditingStudent(null);
  };

  const handleDeleteStudent = (id: string) => {
    if (!canEdit) {
      alert('학생 정보를 삭제할 권한이 없습니다.');
      return;
    }
    if (confirm('정말 삭제하시겠습니까?')) {
      saveStudents(students.filter(s => s.id !== id));
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 엑셀 파일인지 확인
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!validExtensions.includes(fileExtension)) {
      setUploadMessage({ type: 'error', text: '엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.' });
      return;
    }

    setUploading(true);
    setUploadMessage(null);

    try {
      const newStudents = await parseExcelFile(file);
      
      // 기존 학생과 병합 (중복 제거)
      const existingIds = new Set(students.map(s => s.id));
      const studentsToAdd: Student[] = [];
      const studentsToUpdate: Student[] = [];
      const duplicateCount = { count: 0 };

      newStudents.forEach(newStudent => {
        if (existingIds.has(newStudent.id)) {
          // 기존 학생이면 업데이트
          studentsToUpdate.push(newStudent);
          duplicateCount.count++;
        } else {
          // 새 학생이면 추가
          studentsToAdd.push(newStudent);
        }
      });

      // 업데이트 및 추가
      let updatedStudents = [...students];
      
      // 업데이트
      studentsToUpdate.forEach(updatedStudent => {
        const index = updatedStudents.findIndex(s => s.id === updatedStudent.id);
        if (index >= 0) {
          updatedStudents[index] = updatedStudent;
        }
      });

      // 추가
      updatedStudents = [...updatedStudents, ...studentsToAdd];

      saveStudents(updatedStudents);

      const message = `성공적으로 ${newStudents.length}명의 학생을 ${duplicateCount.count > 0 ? '업데이트/추가' : '추가'}했습니다.`;
      setUploadMessage({ type: 'success', text: message });
      
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setUploadMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : '엑셀 파일을 읽는 중 오류가 발생했습니다.' 
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadExcelTemplate();
  };


  return (
    <div className="student-management">
      <div className="page-header">
        <h2>학생 관리</h2>
        <div className="header-actions">
          <button onClick={handleDownloadTemplate} className="template-btn">
            <Download size={18} />
            <span>엑셀 템플릿 다운로드</span>
          </button>
          <label className="upload-btn">
            <Upload size={18} />
            <span>엑셀 파일 업로드</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              disabled={uploading}
            />
          </label>
          <button onClick={() => setShowAddForm(true)} className="add-btn">
            학생 추가
          </button>
        </div>
      </div>

      {uploadMessage && (
        <div className={`upload-message ${uploadMessage.type}`}>
          {uploadMessage.text}
        </div>
      )}

      {uploading && (
        <div className="uploading-overlay">
          <div className="uploading-spinner">엑셀 파일을 읽는 중...</div>
        </div>
      )}

      <div className="filters-section">
        <div className="filters">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="이름, 번호, 학년반으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <select
            value={filterGrade || ''}
            onChange={(e) => setFilterGrade(e.target.value ? Number(e.target.value) as 1 | 2 | 3 : null)}
            className="filter-select"
          >
            <option value="">전체 학년</option>
            <option value="1">1학년</option>
            <option value="2">2학년</option>
            <option value="3">3학년</option>
          </select>
          <select
            value={filterClass || ''}
            onChange={(e) => setFilterClass(e.target.value ? Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6 : null)}
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
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            <option value="25">25개씩 보기</option>
            <option value="50">50개씩 보기</option>
            <option value="100">100개씩 보기</option>
            <option value="200">200개씩 보기</option>
          </select>
        </div>
        <div className="students-count">
          총 {filteredStudents.length}명 (전체 {students.length}명)
        </div>
      </div>

      {showAddForm && (
        <StudentForm
          onSave={handleAddStudent}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {editingStudent && (
        <StudentForm
          student={editingStudent}
          onSave={handleUpdateStudent}
          onCancel={() => setEditingStudent(null)}
        />
      )}

      <div className="students-table-container">
        <table className="students-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => handleSort('grade')}>
                학년
                {sortField === 'grade' && (
                  <span className="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="sortable" onClick={() => handleSort('class')}>
                반
                {sortField === 'class' && (
                  <span className="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="sortable" onClick={() => handleSort('number')}>
                번호
                {sortField === 'number' && (
                  <span className="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="sortable" onClick={() => handleSort('name')}>
                이름
                {sortField === 'name' && (
                  <span className="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th>상태</th>
              <th>홈스쿨링 기간</th>
              <th>귀가 교시</th>
              <th className="actions-col">작업</th>
            </tr>
          </thead>
          <tbody>
            {paginatedStudents.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-state">
                  학생이 없습니다.
                </td>
              </tr>
            ) : (
              paginatedStudents.map(student => (
                <tr key={student.id}>
                  <td>{student.grade}학년</td>
                  <td>{student.class}반</td>
                  <td>{student.number}번</td>
                  <td className="name-cell">{student.name}</td>
                  <td>
                    <div className="status-badges">
                      {student.isHomeSchool && (
                        <span className="badge-table homeschool" title={`홈스쿨링: ${student.homeSchoolStartDate || ''} ~ ${student.homeSchoolEndDate || ''}`}>
                          홈스
                        </span>
                      )}
                      {student.isHomeReturn && (
                        <span className="badge-table homereturn">귀가</span>
                      )}
                      {student.isFriendshipClass && (
                        <span className="badge-table friendship" title="우정반">
                          우정반
                        </span>
                      )}
                      {!student.isHomeSchool && !student.isHomeReturn && !student.isFriendshipClass && (
                        <span className="badge-none-table">-</span>
                      )}
                    </div>
                  </td>
                  <td className="date-cell">
                    {student.isHomeSchool ? (
                      <span>
                        {student.homeSchoolStartDate || '-'} ~ {student.homeSchoolEndDate || '-'}
                      </span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td>
                    {student.isHomeReturn && student.homeReturnStartPeriod ? (
                      <span>{student.homeReturnStartPeriod}교시</span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className="actions-cell">
                    <button
                      onClick={() => setEditingStudent(student)}
                      className="action-btn edit-action"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDeleteStudent(student.id)}
                      className="action-btn delete-action"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="page-btn"
            >
              <ChevronLeft size={18} />
              이전
            </button>
            <div className="page-numbers">
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
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="page-btn"
            >
              다음
              <ChevronRight size={18} />
            </button>
            <span className="page-info">
              {startIndex + 1}-{Math.min(endIndex, filteredStudents.length)} / {filteredStudents.length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface StudentFormProps {
  student?: Student;
  onSave: (student: Student | Omit<Student, 'id'>) => void;
  onCancel: () => void;
}

function StudentForm({ student, onSave, onCancel }: StudentFormProps) {
  const [formData, setFormData] = useState({
    name: student?.name || '',
    grade: student?.grade || 1,
    class: student?.class || 1,
    number: student?.number || 1,
    isHomeSchool: student?.isHomeSchool || false,
    homeSchoolStartDate: student?.homeSchoolStartDate || '',
    homeSchoolEndDate: student?.homeSchoolEndDate || '',
    isHomeReturn: student?.isHomeReturn || false,
    homeReturnStartPeriod: student?.homeReturnStartPeriod || 1,
    isFriendshipClass: student?.isFriendshipClass || false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (student) {
      onSave({ ...student, ...formData });
    } else {
      onSave(formData);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{student ? '학생 수정' : '학생 추가'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>이름</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>학년</label>
              <select
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: Number(e.target.value) as 1 | 2 | 3 })}
              >
                <option value="1">1학년</option>
                <option value="2">2학년</option>
                <option value="3">3학년</option>
              </select>
            </div>
            <div className="form-group">
              <label>반</label>
              <select
                value={formData.class}
                onChange={(e) => setFormData({ ...formData, class: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6 })}
              >
                <option value="1">1반</option>
                <option value="2">2반</option>
                <option value="3">3반</option>
                <option value="4">4반</option>
                <option value="5">5반</option>
                <option value="6">6반</option>
              </select>
            </div>
            <div className="form-group">
              <label>번호</label>
              <input
                type="number"
                min="1"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: Number(e.target.value) })}
                required
              />
            </div>
          </div>
          <div className="form-group toggle-group">
            <div className="toggle-container">
              <label htmlFor="isHomeSchool" className="toggle-label">
                <span className="toggle-text">홈스쿨링 학생</span>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    id="isHomeSchool"
                    checked={formData.isHomeSchool}
                    onChange={(e) => setFormData({ ...formData, isHomeSchool: e.target.checked })}
                    className="toggle-input"
                  />
                  <span className="toggle-slider"></span>
                </div>
              </label>
              {formData.isHomeSchool && (
                <div className="toggle-content">
                  <div className="form-group-inline">
                    <label>홈스쿨링 시작일</label>
                    <input
                      type="date"
                      value={formData.homeSchoolStartDate}
                      onChange={(e) => setFormData({ ...formData, homeSchoolStartDate: e.target.value })}
                    />
                  </div>
                  <div className="form-group-inline">
                    <label>홈스쿨링 종료일</label>
                    <input
                      type="date"
                      value={formData.homeSchoolEndDate}
                      onChange={(e) => setFormData({ ...formData, homeSchoolEndDate: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="form-group toggle-group">
            <div className="toggle-container">
              <label htmlFor="isHomeReturn" className="toggle-label">
                <span className="toggle-text">귀가 학생 (자율학습 안하고 집으로 가는 경우)</span>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    id="isHomeReturn"
                    checked={formData.isHomeReturn}
                    onChange={(e) => setFormData({ ...formData, isHomeReturn: e.target.checked })}
                    className="toggle-input"
                  />
                  <span className="toggle-slider"></span>
                </div>
              </label>
              {formData.isHomeReturn && (
                <div className="toggle-content">
                  <div className="form-group-inline">
                    <label>귀가 시작 교시</label>
                    <select
                      value={formData.homeReturnStartPeriod}
                      onChange={(e) => setFormData({ ...formData, homeReturnStartPeriod: Number(e.target.value) })}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(period => (
                        <option key={period} value={period}>{period}교시</option>
                      ))}
                    </select>
                  </div>
                  <p className="form-hint-inline">선택한 교시부터 자동으로 귀가 상태로 표시됩니다.</p>
                </div>
              )}
            </div>
          </div>
          <div className="form-group toggle-group">
            <div className="toggle-container">
              <label htmlFor="isFriendshipClass" className="toggle-label">
                <span className="toggle-text">우정반 학생</span>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    id="isFriendshipClass"
                    checked={formData.isFriendshipClass}
                    onChange={(e) => setFormData({ ...formData, isFriendshipClass: e.target.checked })}
                    className="toggle-input"
                  />
                  <span className="toggle-slider"></span>
                </div>
              </label>
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

