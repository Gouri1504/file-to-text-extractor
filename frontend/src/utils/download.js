// utils/download.js
// Browser file-saver helpers. Centralized because the original code
// duplicated the "create <a>, click, remove" pattern in three places.

export const downloadText = (text, filename, mimeType = 'text/plain') => {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  // Free the object URL after the click chain so we don't leak across many
  // downloads in long sessions.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const triggerDownload = (href, filename) => {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const copyToClipboard = async (text) => {
  if (!navigator.clipboard) {
    // Fallback for very old browsers / non-HTTPS dev environments where
    // clipboard API isn't exposed.
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return;
  }
  await navigator.clipboard.writeText(text);
};
