export const getCsrfToken = () => {
  const name = 'csrftoken';
  const cookies = document.cookie.split(';');

  for (let cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === name) return value;
  }

  console.warn("⚠️ CSRF token not found in cookies");
  return null;
};