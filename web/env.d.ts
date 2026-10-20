interface Window {
  google?: { accounts: { id: { initialize: (options: { client_id: string; callback: (response: { credential: string }) => void; auto_select?: boolean }) => void; renderButton: (element: HTMLElement, options: { theme: string; size: string; text: string; shape: string; width: number; locale: string }) => void; disableAutoSelect: () => void } } };
}
