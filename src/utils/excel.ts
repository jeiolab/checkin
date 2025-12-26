import * as XLSX from 'xlsx';
import type { Student } from '../types';

export interface ExcelStudentRow {
  학년?: number | string;
  반?: number | string;
  번호?: number | string;
  이름?: string;
  홈스쿨링?: string | boolean;
  홈스쿨링시작일?: string;
  홈스쿨링종료일?: string;
  귀가?: string | boolean;
  우정반?: string | boolean;
}

/**
 * 엑셀 파일을 읽어서 학생 데이터로 변환
 */
export const parseExcelFile = (file: File): Promise<Student[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('파일을 읽을 수 없습니다.'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // JSON으로 변환
        const jsonData: ExcelStudentRow[] = XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
        });

        // 학생 데이터로 변환
        const students: Student[] = [];
        const errors: string[] = [];

        jsonData.forEach((row, index) => {
          try {
            const grade = Number(row.학년);
            const classNum = Number(row.반);
            const number = Number(row.번호);
            const name = String(row.이름 || '').trim();

            // 필수 필드 검증
            if (!grade || grade < 1 || grade > 3) {
              errors.push(`${index + 2}행: 학년이 올바르지 않습니다 (1-3)`);
              return;
            }
            if (!classNum || classNum < 1 || classNum > 6) {
              errors.push(`${index + 2}행: 반이 올바르지 않습니다 (1-6)`);
              return;
            }
            if (!number || number < 1) {
              errors.push(`${index + 2}행: 번호가 올바르지 않습니다`);
              return;
            }
            if (!name) {
              errors.push(`${index + 2}행: 이름이 없습니다`);
              return;
            }

            // 홈스쿨링 여부
            const isHomeSchool = 
              row.홈스쿨링 === true || 
              row.홈스쿨링 === 'Y' || 
              row.홈스쿨링 === 'y' || 
              row.홈스쿨링 === '예' ||
              row.홈스쿨링 === 'true' ||
              String(row.홈스쿨링).toLowerCase() === 'true';

            // 귀가 여부
            const isHomeReturn = 
              row.귀가 === true || 
              row.귀가 === 'Y' || 
              row.귀가 === 'y' || 
              row.귀가 === '예' ||
              row.귀가 === 'true' ||
              (typeof row.귀가 === 'string' && row.귀가.toLowerCase() === 'true');

            // 우정반 여부
            const isFriendshipClass = 
              row.우정반 === true || 
              row.우정반 === 'Y' || 
              row.우정반 === 'y' || 
              row.우정반 === '예' ||
              row.우정반 === 'true' ||
              (row.우정반 && String(row.우정반).toLowerCase() === 'true');

            const student: Student = {
              id: `${grade}-${classNum}-${number}`,
              name,
              grade: grade as 1 | 2 | 3,
              class: classNum as 1 | 2 | 3 | 4 | 5 | 6,
              number,
              isHomeSchool: isHomeSchool || undefined,
              homeSchoolStartDate: row.홈스쿨링시작일 ? String(row.홈스쿨링시작일) : undefined,
              homeSchoolEndDate: row.홈스쿨링종료일 ? String(row.홈스쿨링종료일) : undefined,
              isHomeReturn: isHomeReturn || undefined,
              isFriendshipClass: isFriendshipClass || undefined,
            };

            students.push(student);
          } catch (error) {
            errors.push(`${index + 2}행: 데이터 처리 중 오류가 발생했습니다`);
          }
        });

        if (errors.length > 0) {
          console.warn('엑셀 파싱 경고:', errors);
        }

        if (students.length === 0) {
          reject(new Error('읽을 수 있는 학생 데이터가 없습니다. 엑셀 파일 형식을 확인해주세요.'));
          return;
        }

        resolve(students);
      } catch (error) {
        reject(new Error(`엑셀 파일을 읽는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
    };

    reader.readAsBinaryString(file);
  });
};

/**
 * 학생 데이터를 엑셀 파일로 다운로드 (템플릿)
 */
export const downloadExcelTemplate = () => {
  const templateData: ExcelStudentRow[] = [
    {
      학년: 1,
      반: 1,
      번호: 1,
      이름: '홍길동',
      홈스쿨링: '',
      홈스쿨링시작일: '',
      홈스쿨링종료일: '',
      귀가: '',
    },
    {
      학년: 1,
      반: 1,
      번호: 2,
      이름: '김철수',
      홈스쿨링: 'Y',
      홈스쿨링시작일: '2024-01-01',
      홈스쿨링종료일: '2024-03-31',
      귀가: '',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '학생명단');

  // 컬럼 너비 설정
  worksheet['!cols'] = [
    { wch: 8 },  // 학년
    { wch: 8 },  // 반
    { wch: 8 },  // 번호
    { wch: 15 }, // 이름
    { wch: 12 }, // 홈스쿨링
    { wch: 15 }, // 홈스쿨링시작일
    { wch: 15 }, // 홈스쿨링종료일
    { wch: 8 },  // 귀가
  ];

  XLSX.writeFile(workbook, '학생명단_템플릿.xlsx');
};

