const toggle = document.getElementById('toggle') as HTMLInputElement;

// Load current state
storage.getItem<boolean>('local:enabled').then((v) => {
  toggle.checked = v ?? true;
});

// Write changes — background will broadcast to tabs
toggle.addEventListener('change', () => {
  storage.setItem('local:enabled', toggle.checked);
});
