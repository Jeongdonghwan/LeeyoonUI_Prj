interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 16 }}>
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        style={styles.btn}
      >
        ‹
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          style={p === page ? { ...styles.btn, ...styles.active } : styles.btn}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        style={styles.btn}
      >
        ›
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  btn: {
    padding: '4px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 4,
    background: '#fff',
    cursor: 'pointer',
    fontSize: 13,
    color: '#374151',
  },
  active: {
    background: '#4f6ef7',
    color: '#fff',
    borderColor: '#4f6ef7',
  },
};
