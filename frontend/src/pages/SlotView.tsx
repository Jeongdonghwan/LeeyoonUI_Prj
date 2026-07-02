import { useState } from 'react';

export default function SlotView() {
  const [result] = useState<{ created: number; errors: any[] } | null>(null);

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>슬롯 등록</h2>

      {/* 공지 섹션 */}
      <div style={styles.notice}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>세팅 관련 공지</h3>
        <ul style={{ paddingLeft: 20, fontSize: 13, color: '#4b5563', lineHeight: 2 }}>
          <li>상품 ID는 필수 입력이며, 상품 URL의 <strong>/products/OOOOOOO</strong> 부분의 숫자를 입력합니다.</li>
          <li><strong style={{ color: '#dc2626' }}>* (빨간색)</strong> 텍스트는 필수 입력 항목입니다. (단일 MID, 검색어, 메인 키워드, 상품 ID)</li>
          <li>가격 비교 상품의 경우, <strong>가격 비교 MID</strong>를 반드시 입력해야 합니다.</li>
          <li>수동 세팅(로직1) 검색어는 검색 시 40위 이내 키워드만 입력하며, 쉼표(,)로 구분하고 최대 10개까지 가능합니다.</li>
          <li>자동 세팅 검색어도 동일한 입력 형식이며, 5개 이상 입력을 권장합니다.</li>
          <li><strong>메인 검색어</strong>는 1개만 입력합니다.</li>
          <li>검색어는 CPC가 포함되지 않은 키워드로 입력해주세요.</li>
          <li>검색 결과가 정상적으로 생성되지 않을 경우, 입력 항목을 다시 확인해주세요.</li>
        </ul>
      </div>

      {/* 업로드 결과 */}
      {result && (
        <div style={{ marginTop: 16, padding: 16, background: '#fff', borderRadius: 8 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>업로드 결과</h3>
          <p style={{ fontSize: 14 }}>
            성공: <strong style={{ color: '#16a34a' }}>{result.created}건</strong>
            {result.errors.length > 0 && (
              <>, 실패: <strong style={{ color: '#dc2626' }}>{result.errors.length}건</strong></>
            )}
          </p>
          {result.errors.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 13 }}>
              {result.errors.map((err, i) => (
                <div key={i} style={{ color: '#dc2626' }}>행 {err.row}: {err.error}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  notice: {
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: 8,
    padding: '16px 20px',
  },
};
