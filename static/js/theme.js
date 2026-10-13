// Light/dark toggle (light by default): the button names the mode it switches to
function currentTheme() {
    return document.documentElement.dataset.theme || 'light';
}

function setupThemeToggle() {
    const button = document.getElementById('theme-toggle');
    button.textContent = currentTheme() === 'dark' ? 'light' : 'dark';
    button.addEventListener('click', function() {
        const next = currentTheme() === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        button.textContent = next === 'dark' ? 'light' : 'dark';
        try {
            localStorage.setItem('lb-theme', next);
        } catch (e) {}
    });
}

document.addEventListener('DOMContentLoaded', setupThemeToggle);
