import { itemService } from '@/api/services';

/** Sau khi chọn vật tư/sản phẩm từ gợi ý: gửi chuỗi user gõ (≥2 ký tự) để nối vào MdItem.SearchText trên server. */
export function appendItemSearchPhraseFromSuggest(itemUuid: string, typedQuery?: string): void {
  const q = typedQuery?.trim() ?? '';
  if (q.length < 2 || !itemUuid) return;
  void itemService.appendSearchPhrase(itemUuid, q).catch(() => undefined);
}
