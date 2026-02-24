const toggle = document.getElementById('toggle') as HTMLInputElement;
const themeSelect = document.getElementById('theme') as HTMLSelectElement;

// Load current state
storage.getItem<boolean>('local:enabled').then((v) => {
  toggle.checked = v ?? true;
});
storage.getItem<string>('local:theme').then((v) => {
  themeSelect.value = v ?? 'default';
});

// Write changes — background will broadcast to tabs
toggle.addEventListener('change', () => {
  storage.setItem('local:enabled', toggle.checked);
});
themeSelect.addEventListener('change', () => {
  storage.setItem('local:theme', themeSelect.value);
});
