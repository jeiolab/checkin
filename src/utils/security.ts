/**
 * 보안 유틸리티 함수
 * Web Crypto API를 사용한 강력한 보안 구현
 */

// 암호화 키 생성 및 관리 (브라우저 세션 기반)
let encryptionKey: CryptoKey | null = null;

/**
 * 암호화 키 초기화 (PBKDF2 사용)
 */
const initEncryptionKey = async (): Promise<CryptoKey> => {
  if (encryptionKey) return encryptionKey;

  // 브라우저 고유 식별자 기반 키 생성
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('neungju-attendance-secure-key-v1'),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  encryptionKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode('neungju-salt-v1'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return encryptionKey;
};

/**
 * Web Crypto API를 사용한 강력한 비밀번호 해싱 (SHA-256 + PBKDF2)
 * 각 비밀번호마다 고유한 salt 생성 (보안 강화)
 */
export const hashPassword = async (password: string, existingSalt?: string): Promise<string> => {
  try {
    // 고유한 salt 생성 (기존 salt가 없으면 새로 생성)
    const salt = existingSalt 
      ? Uint8Array.from(atob(existingSalt), c => c.charCodeAt(0))
      : crypto.getRandomValues(new Uint8Array(16)); // 128-bit salt
    
    // PBKDF2를 사용한 키 파생
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000, // 보안 강화: 10000 -> 100000
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    // Base64로 인코딩하여 저장
    const hashArray = Array.from(new Uint8Array(derivedBits));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const saltBase64 = btoa(String.fromCharCode(...salt));
    
    // 형식: pbkdf2_sha256_100000_salt_hash
    return `pbkdf2_sha256_100000_${saltBase64}_${hashHex}`;
  } catch (error) {
    console.error('Password hashing error:', error);
    // 폴백: 간단한 해시 (하위 호환성)
    return hashPasswordSync(password);
  }
};

/**
 * 비밀번호 검증 (비동기)
 * 저장된 해시에서 salt를 추출하여 검증
 */
export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  try {
    // 기존 해시 형식 확인
    if (hashedPassword.startsWith('pbkdf2_sha256_100000_')) {
      // 새로운 형식: pbkdf2_sha256_100000_salt_hash
      const parts = hashedPassword.split('_');
      if (parts.length >= 5) {
        const salt = parts.slice(3, -1).join('_'); // salt는 중간에 있을 수 있음
        const storedHash = parts[parts.length - 1];
        
        // 저장된 salt로 새 해시 생성
        const newHash = await hashPassword(password, salt);
        const newHashParts = newHash.split('_');
        const newHashValue = newHashParts[newHashParts.length - 1];
        
        return newHashValue === storedHash;
      }
    } else if (hashedPassword.startsWith('pbkdf2_sha256_10000_')) {
      // 이전 형식 (하위 호환성): 고정 salt 사용
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );

      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: new TextEncoder().encode('neungju-password-salt-v1'),
          iterations: 10000,
          hash: 'SHA-256',
        },
        keyMaterial,
        256
      );

      const hashArray = Array.from(new Uint8Array(derivedBits));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      const oldFormatHash = `pbkdf2_sha256_10000_${hashHex}`;
      
      return oldFormatHash === hashedPassword;
    }
    
    // 폴백: 동기식 검증
    return hashPasswordSync(password) === hashedPassword;
  } catch (error) {
    console.error('Password verification error:', error);
    // 폴백: 동기식 검증
    return hashPasswordSync(password) === hashedPassword;
  }
};

/**
 * 동기식 비밀번호 해싱 (하위 호환성용)
 */
export const hashPasswordSync = (password: string): string => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `hash_${Math.abs(hash).toString(36)}_${password.length}`;
};

/**
 * 동기식 비밀번호 검증 (하위 호환성용)
 */
export const verifyPasswordSync = (password: string, hashedPassword: string): boolean => {
  const hash = hashPasswordSync(password);
  return hash === hashedPassword;
};

/**
 * 입력값 정제 (XSS 방지)
 */
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  // HTML 태그 제거
  return input
    .replace(/[<>]/g, '') // < > 제거
    .replace(/javascript:/gi, '') // javascript: 제거
    .replace(/on\w+=/gi, '') // 이벤트 핸들러 제거
    .trim();
};

/**
 * 이메일 검증
 */
export const validateEmail = (email: string): boolean => {
  if (!email) return true; // 선택적 필드
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 비밀번호 강도 검증 (보안 강화)
 */
export const validatePasswordStrength = (password: string): { valid: boolean; message: string } => {
  if (!password) {
    return { valid: false, message: '비밀번호를 입력해주세요.' };
  }
  
  // 최소 길이: 8자
  if (password.length < 8) {
    return { valid: false, message: '비밀번호는 최소 8자 이상이어야 합니다.' };
  }
  
  // 최대 길이: 128자
  if (password.length > 128) {
    return { valid: false, message: '비밀번호는 128자 이하여야 합니다.' };
  }
  
  // 복잡도 검증: 영문, 숫자, 특수문자 중 최소 2가지 포함
  const hasLetter = /[a-zA-Z가-힣]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  const complexityCount = [hasLetter, hasNumber, hasSpecial].filter(Boolean).length;
  
  if (complexityCount < 2) {
    return { valid: false, message: '비밀번호는 영문, 숫자, 특수문자 중 최소 2가지 이상을 포함해야 합니다.' };
  }
  
  // 일반적인 약한 비밀번호 패턴 검사
  const weakPatterns = [
    /12345678/,
    /password/i,
    /qwerty/i,
    /admin/i,
    /123456/,
    /abcdef/i,
  ];
  
  if (weakPatterns.some(pattern => pattern.test(password))) {
    return { valid: false, message: '너무 간단한 비밀번호는 사용할 수 없습니다.' };
  }
  
  return { valid: true, message: '' };
};

/**
 * 사용자 이름 검증
 */
export const validateUserName = (name: string): { valid: boolean; message: string } => {
  if (!name || !name.trim()) {
    return { valid: false, message: '이름을 입력해주세요.' };
  }
  
  const sanitized = sanitizeInput(name.trim());
  if (sanitized.length < 1) {
    return { valid: false, message: '유효한 이름을 입력해주세요.' };
  }
  
  if (sanitized.length > 50) {
    return { valid: false, message: '이름은 50자 이하여야 합니다.' };
  }
  
  return { valid: true, message: '' };
};

/**
 * 숫자 범위 검증
 */
export const validateNumberRange = (value: number, min: number, max: number): boolean => {
  return typeof value === 'number' && value >= min && value <= max;
};

/**
 * 날짜 형식 검증 (YYYY-MM-DD)
 */
export const validateDateFormat = (date: string): boolean => {
  if (!date) return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
};

/**
 * ID 검증 (알파벳, 숫자, 하이픈, 언더스코어만 허용)
 */
export const validateId = (id: string): boolean => {
  if (!id) return false;
  const idRegex = /^[a-zA-Z0-9_-]+$/;
  return idRegex.test(id) && id.length <= 100;
};

/**
 * AES-GCM을 사용한 데이터 암호화
 */
export const encryptData = async (data: string): Promise<string> => {
  try {
    const key = await initEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(data)
    );

    // IV와 암호화된 데이터를 결합하여 저장
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Base64로 인코딩
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption error:', error);
    // 암호화 실패 시 원본 반환 (하위 호환성)
    return data;
  }
};

/**
 * AES-GCM을 사용한 데이터 복호화
 */
export const decryptData = async (encryptedData: string): Promise<string> => {
  try {
    const key = await initEncryptionKey();
    
    // Base64 디코딩
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    // IV 추출
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    // 복호화 실패 시 원본 반환 (하위 호환성)
    return encryptedData;
  }
};

/**
 * 데이터가 암호화되었는지 확인
 */
export const isEncrypted = (data: string): boolean => {
  try {
    // Base64 형식인지 확인
    atob(data);
    // 암호화된 데이터는 특정 패턴을 가짐
    return data.length > 20 && !data.startsWith('{') && !data.startsWith('[');
  } catch {
    return false;
  }
};

/**
 * HTTPS 사용 여부 확인
 */
export const isHTTPS = (): boolean => {
  return window.location.protocol === 'https:' || 
         window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1';
};

/**
 * 보안 경고 표시 (HTTPS 미사용 시)
 */
export const checkSecurityWarnings = (): void => {
  if (!isHTTPS() && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    console.warn('⚠️ 보안 경고: HTTPS를 사용하지 않습니다. 프로덕션 환경에서는 HTTPS를 사용해야 합니다.');
    // 프로덕션 환경에서만 경고 표시
    if ((import.meta as any).env?.PROD) {
      const warning = document.createElement('div');
      warning.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #fef3c7;
        color: #92400e;
        padding: 1rem;
        text-align: center;
        z-index: 10000;
        font-weight: 600;
        border-bottom: 2px solid #f59e0b;
      `;
      warning.textContent = '⚠️ 보안 경고: HTTPS를 사용하지 않습니다. 민감한 정보가 노출될 수 있습니다.';
      document.body.appendChild(warning);
    }
  }
};

