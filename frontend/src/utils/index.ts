/**
 * 从 tileset URL 中提取 resultId
 * @param url - tileset URL，例如: http://localhost:8080/results/some-uuid/tileset.json
 * @returns resultId 或 null
 */
export function extractResultIdFromUrl(url: string): string | null {
  const urlParts = url.split('/');
  if (urlParts.length > 2) {
    return urlParts[urlParts.length - 2];
  }
  return null;
}

/**
 * 格式化键名（将下划线替换为空格并首字母大写）
 * @param key - 原始键名
 * @returns 格式化后的键名
 */
export function formatKey(key: string): string {
  return key.replace(/_/g, ' ');
}

