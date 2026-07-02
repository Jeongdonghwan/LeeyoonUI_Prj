from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment
from io import BytesIO

TEMPLATE_COLUMNS = [
    ('묶음MID', 15),
    ('단품MID*', 15),
    ('검색어*', 25),
    ('메인검색어*', 20),
    ('상품ID*', 15),
    ('메모', 25),
]

REQUIRED_COLUMNS = ['단품MID*', '검색어*', '메인검색어*', '상품ID*']
REQUIRED_KEYS = ['단품MID', '검색어', '메인검색어', '상품ID']


def generate_slot_template():
    wb = Workbook()
    ws = wb.active
    ws.title = '슬롯등록양식'

    header_fill = PatternFill(start_color='1a2744', end_color='1a2744', fill_type='solid')
    header_font = Font(color='FFFFFF', bold=True, size=11)
    required_font = Font(color='FF0000', bold=True, size=11)

    for col_idx, (name, width) in enumerate(TEMPLATE_COLUMNS, 1):
        cell = ws.cell(row=1, column=col_idx, value=name)
        cell.fill = header_fill
        cell.font = required_font if '*' in name else header_font
        cell.alignment = Alignment(horizontal='center')
        ws.column_dimensions[cell.column_letter].width = width

    example = ['MID001', 'SMID001', '키워드1,키워드2,키워드3', '메인키워드', '12345678', '메모']
    for col_idx, val in enumerate(example, 1):
        ws.cell(row=2, column=col_idx, value=val)

    output = BytesIO()
    wb.save(output)
    output.seek(0)
    return output


def parse_slot_excel(file_bytes, user_id, created_by):
    wb = load_workbook(filename=BytesIO(file_bytes), read_only=True)
    ws = wb.active

    rows = list(ws.iter_rows(values_only=True))
    if len(rows) < 2:
        return [], 0, [{'row': 0, 'error': '데이터가 없습니다.'}]

    headers = [str(h).replace('*', '').strip() if h else '' for h in rows[0]]

    for req in REQUIRED_KEYS:
        if req not in headers:
            return [], 0, [{'row': 0, 'error': f'필수 컬럼 "{req}"이(가) 없습니다.'}]

    col_map = {h: i for i, h in enumerate(headers)}
    results = []
    errors = []

    for row_idx, row in enumerate(rows[1:], 2):
        try:
            single_mid = row[col_map.get('단품MID', -1)] if col_map.get('단품MID') is not None else None
            keyword = row[col_map.get('검색어', -1)] if col_map.get('검색어') is not None else None
            main_keyword = row[col_map.get('메인검색어', -1)] if col_map.get('메인검색어') is not None else None
            product_id = row[col_map.get('상품ID', -1)] if col_map.get('상품ID') is not None else None

            if not all([single_mid, keyword, main_keyword, product_id]):
                errors.append({'row': row_idx, 'error': '필수 항목 누락'})
                continue

            slot_data = {
                'user_id': user_id,
                'created_by': created_by,
                'keyword_main': str(main_keyword),
                'keyword_compare': str(keyword),
                'single_mid': str(single_mid),
                'compare_mid': str(row[col_map['묶음MID']]) if col_map.get('묶음MID') is not None and row[col_map['묶음MID']] else None,
                'product_url': str(product_id),
                'memo': str(row[col_map['메모']]) if col_map.get('메모') is not None and row[col_map['메모']] else None,
                'start_date': str(row[col_map['시작일']]) if col_map.get('시작일') is not None and row[col_map['시작일']] else None,
                'end_date': str(row[col_map['종료일']]) if col_map.get('종료일') is not None and row[col_map['종료일']] else None,
                'status': 'pending',
                'quantity': 1,
            }
            results.append(slot_data)
        except Exception as e:
            errors.append({'row': row_idx, 'error': str(e)})

    return results, len(results), errors


def export_slots_excel(slots):
    wb = Workbook()
    ws = wb.active
    ws.title = '슬롯목록'

    columns = ['슬롯번호', '상태', '생성자', '아이디', '메인키워드', '비교키워드',
               '단일MID', '비교MID', '상품URL', '비교URL', '시작일', '종료일',
               '수량', '메모', '생성일']

    header_fill = PatternFill(start_color='1a2744', end_color='1a2744', fill_type='solid')
    header_font = Font(color='FFFFFF', bold=True, size=11)

    for col_idx, name in enumerate(columns, 1):
        cell = ws.cell(row=1, column=col_idx, value=name)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal='center')

    for row_idx, slot in enumerate(slots, 2):
        ws.cell(row=row_idx, column=1, value=slot.get('id'))
        ws.cell(row=row_idx, column=2, value=slot.get('status'))
        ws.cell(row=row_idx, column=3, value=slot.get('creator_username', ''))
        ws.cell(row=row_idx, column=4, value=slot.get('user_username', ''))
        ws.cell(row=row_idx, column=5, value=slot.get('keyword_main'))
        ws.cell(row=row_idx, column=6, value=slot.get('keyword_compare'))
        ws.cell(row=row_idx, column=7, value=slot.get('single_mid'))
        ws.cell(row=row_idx, column=8, value=slot.get('compare_mid'))
        ws.cell(row=row_idx, column=9, value=slot.get('product_url'))
        ws.cell(row=row_idx, column=10, value=slot.get('compare_url'))
        ws.cell(row=row_idx, column=11, value=str(slot.get('start_date', '') or ''))
        ws.cell(row=row_idx, column=12, value=str(slot.get('end_date', '') or ''))
        ws.cell(row=row_idx, column=13, value=slot.get('quantity'))
        ws.cell(row=row_idx, column=14, value=slot.get('memo'))
        ws.cell(row=row_idx, column=15, value=str(slot.get('created_at', '') or ''))

    output = BytesIO()
    wb.save(output)
    output.seek(0)
    return output


def export_logs_excel(logs, changes_map=None):
    """
    logs: 로그 목록
    changes_map: { log_id: [{ field_label, old_value, new_value }, ...] } — 수정 로그의 변경 상세
    """
    if changes_map is None:
        changes_map = {}

    wb = Workbook()
    ws = wb.active
    ws.title = '로그'

    columns = [
        ('번호', 8),
        ('구분', 10),
        ('사용자ID', 18),
        ('수정자', 18),
        ('슬롯번호', 10),
        ('슬롯타입', 12),
        ('수량', 10),
        ('타수', 12),
        ('생성일시', 22),
        ('변경항목', 16),
        ('변경전', 30),
        ('변경후', 30),
    ]

    header_fill = PatternFill(start_color='1a2744', end_color='1a2744', fill_type='solid')
    header_font = Font(color='FFFFFF', bold=True, size=11)
    old_font = Font(color='DC2626')
    new_font = Font(color='16A34A')

    for col_idx, (name, width) in enumerate(columns, 1):
        cell = ws.cell(row=1, column=col_idx, value=name)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal='center')
        ws.column_dimensions[cell.column_letter].width = width

    row_idx = 2
    for log in logs:
        slot_type = log.get('slot_type') if log.get('slot_type') is not None else 100
        quantity = log.get('quantity') or 0
        ta = quantity * slot_type
        log_id = log.get('id')
        details = changes_map.get(log_id, [])

        if log.get('type') == '수정' and details:
            # 수정 로그: 변경 항목별로 한 행씩
            for i, d in enumerate(details):
                if i == 0:
                    ws.cell(row=row_idx, column=1, value=log_id)
                    ws.cell(row=row_idx, column=2, value=log.get('type'))
                    ws.cell(row=row_idx, column=3, value=log.get('username') or log.get('user_id'))
                    ws.cell(row=row_idx, column=4, value=log.get('modified_by_username') or '-')
                    ws.cell(row=row_idx, column=5, value=log.get('slot_id') or '-')
                    ws.cell(row=row_idx, column=6, value=slot_type)
                    ws.cell(row=row_idx, column=7, value=quantity)
                    ws.cell(row=row_idx, column=8, value=ta)
                    ws.cell(row=row_idx, column=9, value=str(log.get('created_at', '') or ''))

                cell_field = ws.cell(row=row_idx, column=10, value=d.get('field_label', d.get('field_name', '')))
                cell_old = ws.cell(row=row_idx, column=11, value=d.get('old_value') or '-')
                cell_old.font = old_font
                cell_new = ws.cell(row=row_idx, column=12, value=d.get('new_value') or '-')
                cell_new.font = new_font
                row_idx += 1
        else:
            # 등록/삭제 또는 변경 상세 없는 수정 로그
            ws.cell(row=row_idx, column=1, value=log_id)
            ws.cell(row=row_idx, column=2, value=log.get('type'))
            ws.cell(row=row_idx, column=3, value=log.get('username') or log.get('user_id'))
            ws.cell(row=row_idx, column=4, value=log.get('modified_by_username') or '-')
            ws.cell(row=row_idx, column=5, value=log.get('slot_id') or '-')
            ws.cell(row=row_idx, column=6, value=slot_type)
            ws.cell(row=row_idx, column=7, value=quantity)
            ws.cell(row=row_idx, column=8, value=ta)
            ws.cell(row=row_idx, column=9, value=str(log.get('created_at', '') or ''))
            row_idx += 1

    output = BytesIO()
    wb.save(output)
    output.seek(0)
    return output
