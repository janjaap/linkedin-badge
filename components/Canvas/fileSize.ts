export function fileSize(size: number, decimals = 0, delimiter = ',') {
  if (!size) return '';

  const i = Math.floor(Math.log(size) / Math.log(1024));
  const newSize = (size / 1024 ** i).toFixed(decimals);

  return `${newSize.replace('.', delimiter)} ${['B', 'kB', 'MB', 'GB', 'TB'][i]}`;
}
