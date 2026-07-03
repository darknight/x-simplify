const toggle = document.getElementById('toggle') as HTMLInputElement;
const videosToggle = document.getElementById('toggle-videos') as HTMLInputElement;
const videosRow = document.getElementById('videos-row') as HTMLDivElement;

// Sub-options only apply while the extension is enabled
function syncSubOptions() {
  videosToggle.disabled = !toggle.checked;
  videosRow.classList.toggle('disabled', !toggle.checked);
}

// Load current state
storage.getItem<boolean>('local:enabled').then((v) => {
  toggle.checked = v ?? true;
  syncSubOptions();
});
storage.getItem<boolean>('local:collapseVideos').then((v) => {
  videosToggle.checked = v ?? true;
});

// Write changes — background will broadcast to tabs
toggle.addEventListener('change', () => {
  storage.setItem('local:enabled', toggle.checked);
  syncSubOptions();
});
videosToggle.addEventListener('change', () => {
  storage.setItem('local:collapseVideos', videosToggle.checked);
});
