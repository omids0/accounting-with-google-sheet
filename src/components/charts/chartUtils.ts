const CATEGORY_LABEL_MAX_LEN = 9;

export function truncateCategoryLabel(label: string, maxLen = CATEGORY_LABEL_MAX_LEN): string {
  if (label.length <= maxLen) return label;
  return `${label.slice(0, maxLen - 1)}…`;
}

/** Shared Y-axis width so expense/income bar charts align on the same page. */
export function getCategoryBarYAxisWidth(datasets: { name: string }[][]): number {
  const maxLabelLen = Math.max(
    1,
    ...datasets.flat().map((item) => item.name.length)
  );
  const truncatedLen = Math.min(maxLabelLen, CATEGORY_LABEL_MAX_LEN);
  return Math.min(68, Math.max(30, Math.ceil(truncatedLen * 5.2)));
}
