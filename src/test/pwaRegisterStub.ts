export const useRegisterSW = () => ({
  needRefresh: [false, () => {}] as [boolean, (value: boolean) => void],
  offlineReady: [false, () => {}] as [boolean, (value: boolean) => void],
  updateServiceWorker: (_reloadPage?: boolean) => Promise.resolve(),
});
