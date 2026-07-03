import { differenceInCalendarDays, parseISO } from 'date-fns';

/** 정상(active)이고 종료일이 3일 이내면 '종료예정'으로 표시 */
export function displayStatus(status: string, endDate: string | null): string {
  if (status === 'active' && endDate) {
    const d = differenceInCalendarDays(parseISO(endDate), new Date());
    if (d >= 0 && d <= 3) return 'ending_soon';
  }
  return status;
}

/** 한글 자음(ㄱ~ㅎ)/모음(ㅏ~ㅣ) 단독 포함 여부 = 오타 */
export function hasIncompleteJamo(text: string): boolean {
  return /[ㄱ-ㅣ]/.test(text);
}

export const PLACE_URL_PREFIX = 'https://m.place.naver.com/';
export function isValidPlaceUrl(url: string): boolean {
  return url.includes('m.place.naver.com');
}
