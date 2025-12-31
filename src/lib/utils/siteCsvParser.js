// v1.0 - CSV 기반 사이트 대량 등록 파서 추가 (2025.12.27)
// 기능 요약: CSV 문자열을 파싱하여 사이트 등록에 사용할 수 있는 객체 배열과 오류 정보를 생성합니다.
// 사용 예시: const result = parseSitesCsvContent(csvText);

// 필수 컬럼 정의
const REQUIRED_HEADERS = ['name', 'url', 'username', 'password', 'app_password'];

// 허용 상태 값 정의
const ALLOWED_STATUS = new Set(['connected', 'disconnected', 'error']);

/**
 * CSV 한 줄을 안전하게 분리하는 헬퍼
 * 따옴표로 감싼 값과 이스케이프된 따옴표를 처리합니다.
 */
const splitCsvLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      // 이스케이프된 따옴표 처리
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
};

/**
 * 헤더 문자열을 정규화하여 비교에 사용
 */
const normalizeHeader = (header) => header.trim().toLowerCase().replace(/\s+/g, '_');

/**
 * URL 필드를 정리하여 비교에 사용
 */
const normalizeUrlValue = (value) =>
  value
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')
    .toLowerCase();

/**
 * 도메인 유효성 검증
 */
const isValidDomain = (domain) => {
  if (!domain) return false;
  const pattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return pattern.test(domain);
};

/**
 * CSV 문자열 파싱 및 검증
 */
export const parseSitesCsvContent = (csvContent) => {
  const trimmed = csvContent.replace(/^\uFEFF/, '').trim();

  if (!trimmed) {
    return {
      validRows: [],
      invalidRows: [
        {
          lineNumber: 0,
          issues: ['CSV 파일 내용이 비어 있습니다.']
        }
      ]
    };
  }

  const lines = trimmed.split(/\r?\n/);

  if (lines.length < 2) {
    return {
      validRows: [],
      invalidRows: [
        {
          lineNumber: 0,
          issues: ['데이터 행이 존재하지 않습니다. 최소 1개의 사이트 정보를 포함해야 합니다.']
        }
      ]
    };
  }

  const rawHeaders = splitCsvLine(lines[0]);
  const normalizedHeaders = rawHeaders.map(normalizeHeader);

  const missingHeaders = REQUIRED_HEADERS.filter((required) => !normalizedHeaders.includes(required));

  if (missingHeaders.length > 0) {
    return {
      validRows: [],
      invalidRows: [
        {
          lineNumber: 0,
          issues: [`필수 컬럼이 누락되었습니다: ${missingHeaders.join(', ')}`]
        }
      ]
    };
  }

  const headerIndexMap = Object.fromEntries(normalizedHeaders.map((header, index) => [header, index]));

  const seenUrlMap = new Map(); // 중복 URL 검사
  const validRows = [];
  const invalidRows = [];

  for (let lineNumber = 2; lineNumber <= lines.length; lineNumber += 1) {
    const rawLine = lines[lineNumber - 1];
    if (!rawLine || !rawLine.trim()) {
      continue;
    }

    const tokens = splitCsvLine(rawLine);

    // 누락된 컬럼을 빈 문자열로 채우기
    while (tokens.length < rawHeaders.length) {
      tokens.push('');
    }

    const issues = [];

    const getValue = (header) => {
      const index = headerIndexMap[header];
      if (typeof index !== 'number') return '';
      return tokens[index]?.trim() ?? '';
    };

    const name = getValue('name');
    const urlRaw = getValue('url');
    const username = getValue('username');
    const password = getValue('password');
    const appPasswordRaw = getValue('app_password');
    const statusRaw = getValue('status');

    if (!name) issues.push('사이트 이름이 비어 있습니다.');
    if (!urlRaw) {
      issues.push('사이트 주소가 비어 있습니다.');
    }

    const normalizedUrl = normalizeUrlValue(urlRaw);
    if (urlRaw && !isValidDomain(normalizedUrl)) {
      issues.push('도메인 형식이 올바르지 않습니다.');
    }

    if (!username) issues.push('워드프레스 사용자명이 비어 있습니다.');
    if (!password) issues.push('워드프레스 비밀번호가 비어 있습니다.');
    if (!appPasswordRaw) issues.push('앱 패스워드가 비어 있습니다.');

    const status = statusRaw ? statusRaw.toLowerCase() : undefined;
    if (status && !ALLOWED_STATUS.has(status)) {
      issues.push(`허용되지 않은 상태 값입니다: ${statusRaw}`);
    }

    if (normalizedUrl) {
      if (seenUrlMap.has(normalizedUrl)) {
        issues.push(`동일한 도메인이 이미 CSV ${seenUrlMap.get(normalizedUrl)}행에서 사용되었습니다.`);
      } else {
        seenUrlMap.set(normalizedUrl, lineNumber);
      }
    }

    if (issues.length > 0) {
      invalidRows.push({
        lineNumber,
        issues,
        preview: {
          name,
          url: urlRaw,
          username,
          password,
          app_password: appPasswordRaw,
          status: statusRaw
        }
      });
      continue;
    }

    validRows.push({
      lineNumber,
      site: {
        name,
        url: normalizedUrl,
        username,
        password,
        appPassword: appPasswordRaw,
        status: status || 'disconnected'
      }
    });
  }

  return { validRows, invalidRows };
};

/**
 * 샘플 CSV를 반환하여 템플릿 다운로드에 활용
 */
export const buildSiteCsvTemplate = () => {
  const rows = [
    ['name', 'url', 'username', 'password', 'app_password'],
    ['내 블로그', 'myblog.com', 'admin', 'admin-password', 'abcd efgh ijkl mnop'],
    ['회사 사이트', 'company.com', 'editor', 'secure-password', 'qrst uvwx yzab cdef']
  ];

  return rows.map((row) => row.join(',')).join('\n');
};
