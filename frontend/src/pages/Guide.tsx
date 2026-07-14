import { colors, cardStyle } from '../styles/theme';
import guideSingle from '../assets/guide-single.png';
import guideBulk from '../assets/guide-bulk.png';

export default function Guide() {
  return (
    <div>
      <h2 style={styles.h2}>사용방법</h2>
      <p style={styles.sub}>북두칠성 사이트 캠페인 접수 방법 안내입니다.</p>

      <div style={styles.grid}>
        <div style={{ ...cardStyle, ...styles.imgCard }}>
          <img src={guideSingle} alt="북두칠성 사이트 이용방법 - 단건 접수" style={styles.img} />
        </div>
        <div style={{ ...cardStyle, ...styles.imgCard }}>
          <img src={guideBulk} alt="북두칠성 사이트 이용방법 - 대량 접수(엑셀)" style={styles.img} />
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  h2: { fontSize: 22, fontWeight: 700, color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 6, marginBottom: 20 },
  grid: { display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' },
  imgCard: { padding: 12, flex: '1 1 420px', maxWidth: 560, textAlign: 'center' },
  img: { width: '100%', height: 'auto', borderRadius: 8, display: 'block' },
};
