// auth.js
const Auth = {
    login(username, password) {
        // Simple demo auth
        if (username && password) {
            localStorage.setItem('alpha1_auth', JSON.stringify({
                username,
                role: 'Doctor',
                timestamp: Date.now()
            }));
            return true;
        }
        return false;
    },

    logout() {
        localStorage.removeItem('alpha1_auth');
        window.location.href = 'index.html';
    },

    isAuthenticated() {
        return !!localStorage.getItem('alpha1_auth');
    },

    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'index.html';
        }
    },

    getUser() {
        const auth = localStorage.getItem('alpha1_auth');
        return auth ? JSON.parse(auth) : null;
    }
};

// Global logout handler
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
        });
    }
    Settings.apply(); // Apply theme on load
});

const Settings = {
    get() {
        const def = { theme: 'dark', sound: 'urgent' };
        const s = localStorage.getItem('alpha1_settings');
        return s ? { ...def, ...JSON.parse(s) } : def;
    },
    update(updates) {
        const current = this.get();
        localStorage.setItem('alpha1_settings', JSON.stringify({ ...current, ...updates }));
        this.apply();
    },
    apply() {
        const s = this.get();
        document.documentElement.setAttribute('data-theme', s.theme);
    }
};

// Global Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    // Ignore if user is typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

    switch(e.key.toLowerCase()) {
        case ' ':
            e.preventDefault();
            const playBtn = document.getElementById('btn-play');
            if (playBtn) playBtn.click();
            break;
        case 'n':
            const addBtn = document.getElementById('btn-add-patient');
            if (addBtn) addBtn.click();
            break;
        case 'e':
            const exportBtn = document.getElementById('btn-export-report') || document.getElementById('btn-export');
            if (exportBtn) exportBtn.click();
            break;
        case '?':
            alert("Alpha 1 Keyboard Shortcuts:\n\n[Space] - Play/Pause Simulation\n[N] - Add New Patient\n[E] - Export PDF Report\n[?] - Show this menu");
            break;
    }
});
