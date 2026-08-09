/**
 * OrbVisualizer - Canvas 2D Dynamic Neural Core Orb Renderer
 * High-Vibrancy Risk-Coded Neural Engine (Emerald, Amber, Critical Red, Cyan)
 */
class OrbVisualizer {
    constructor(canvasId, options = {}) {
        this.canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) : canvasId;
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.state = options.state || 'idle'; 
        this.colorTheme = options.colorTheme || 'cyan'; // 'cyan', 'emerald', 'amber', 'critical'
        this.isMini = options.isMini || false;
        
        this.particles = [];
        this.numParticles = this.isMini ? 40 : 85;
        this.radius = options.radius || (this.isMini ? 26 : 80);
        this.time = Math.random() * 100;
        this.targetIntensity = 0.6;
        this.currentIntensity = 0.6;

        this.init();
    }

    init() {
        this.resize();
        if (!this.isMini) {
            window.addEventListener('resize', () => this.resize());
        }
        this.createParticles();
        this.animate();
    }

    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        this.width = this.canvas.width = (rect.width && rect.width > 0) ? rect.width : (this.isMini ? 64 : 300);
        this.height = this.canvas.height = (rect.height && rect.height > 0) ? rect.height : (this.isMini ? 64 : 220);
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
    }

    setColorTheme(theme) {
        this.colorTheme = theme;
        this.createParticles();
    }

    setState(state) {
        this.state = state;
        if (state === 'thinking') this.targetIntensity = 1.0;
        else if (state === 'speaking') this.targetIntensity = 0.85;
        else if (state === 'listening') this.targetIntensity = 0.75;
        else this.targetIntensity = 0.55;
    }

    getThemeColors() {
        if (this.colorTheme === 'critical' || this.colorTheme === 'red') {
            return {
                core: 'rgba(255, 69, 58, 1)',
                glow: 'rgba(255, 69, 58, 0.55)',
                ring: 'rgba(255, 69, 58, 0.8)',
                particle: '#ff453a',
                shadow: 'rgba(255, 69, 58, 0.8)'
            };
        } else if (this.colorTheme === 'amber' || this.colorTheme === 'warning') {
            return {
                core: 'rgba(255, 159, 10, 1)',
                glow: 'rgba(255, 159, 10, 0.5)',
                ring: 'rgba(255, 159, 10, 0.75)',
                particle: '#ff9f0a',
                shadow: 'rgba(255, 159, 10, 0.7)'
            };
        } else if (this.colorTheme === 'emerald' || this.colorTheme === 'normal') {
            return {
                core: 'rgba(48, 209, 88, 1)',
                glow: 'rgba(48, 209, 88, 0.45)',
                ring: 'rgba(48, 209, 88, 0.75)',
                particle: '#30d158',
                shadow: 'rgba(48, 209, 88, 0.65)'
            };
        } else {
            return {
                core: 'rgba(0, 245, 255, 1)',
                glow: 'rgba(6, 182, 212, 0.45)',
                ring: 'rgba(0, 245, 255, 0.8)',
                particle: '#00f5ff',
                shadow: 'rgba(0, 245, 255, 0.75)'
            };
        }
    }

    createParticles() {
        const theme = this.getThemeColors();
        this.particles = [];
        for (let i = 0; i < this.numParticles; i++) {
            this.particles.push({
                angle: Math.random() * Math.PI * 2,
                orbitRadius: this.radius * (0.35 + Math.random() * 0.75),
                speed: (Math.random() - 0.5) * 0.045,
                size: (this.isMini ? 1.2 : 1.6) + Math.random() * (this.isMini ? 2.0 : 2.8),
                color: theme.particle,
                alpha: 0.4 + Math.random() * 0.6,
                pulseOffset: Math.random() * Math.PI * 2
            });
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (!this.ctx) return;

        this.time += 0.03;
        this.currentIntensity += (this.targetIntensity - this.currentIntensity) * 0.06;

        this.ctx.clearRect(0, 0, this.width, this.height);
        const theme = this.getThemeColors();

        // 1. High-Vibrancy Ambient Outer Glow
        const gradient = this.ctx.createRadialGradient(
            this.centerX, this.centerY, 2,
            this.centerX, this.centerY, this.radius * (this.isMini ? 1.4 : 1.8)
        );
        gradient.addColorStop(0, theme.core);
        gradient.addColorStop(0.45, theme.glow);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.radius * (this.isMini ? 1.4 : 1.8), 0, Math.PI * 2);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();

        // 2. Rotating Outer Specular Energy Ring
        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);
        this.ctx.rotate(this.time * 0.8);
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.radius * 0.8, 0, Math.PI * 1.5);
        this.ctx.strokeStyle = theme.ring;
        this.ctx.lineWidth = this.isMini ? 1.8 : 2.5;
        this.ctx.stroke();
        this.ctx.restore();

        // 3. Pulsing Core Center
        this.ctx.beginPath();
        const rPulse = this.radius * (this.isMini ? 0.38 : 0.4) + Math.sin(this.time * 4) * (this.isMini ? 2.5 : 5) * this.currentIntensity;
        this.ctx.arc(this.centerX, this.centerY, Math.max(4, rPulse), 0, Math.PI * 2);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowColor = theme.shadow;
        this.ctx.shadowBlur = (this.isMini ? 18 : 30) * this.currentIntensity;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        // 4. Dense Orbiting Neural Rays
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            p.angle += p.speed * (1 + this.currentIntensity * 1.8);

            const x = this.centerX + Math.cos(p.angle) * p.orbitRadius;
            const y = this.centerY + Math.sin(p.angle + Math.sin(this.time + p.pulseOffset)) * (p.orbitRadius * 0.65);

            this.ctx.beginPath();
            this.ctx.arc(x, y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = theme.particle;
            this.ctx.globalAlpha = p.alpha * (0.65 + Math.sin(this.time * 2.5 + p.pulseOffset) * 0.35);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1.0;
    }
}

window.OrbVisualizer = OrbVisualizer;
