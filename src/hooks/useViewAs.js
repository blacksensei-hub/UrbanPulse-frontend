export function useViewAs() {
  const token = localStorage.getItem('urbanpulse-view-as-token');
  const customerName = localStorage.getItem('urbanpulse-view-as-name');
  return { isViewAs: !!token, customerName };
}
