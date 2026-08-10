// charts.js
// Handles Canvas 2D rendering of scrolling waveforms

class WaveformChart {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        this.options = {
            color: options.color || '#10b981',
            lineWidth: options.lineWidth || 2,
            minY: options.minY || -1,
            maxY: options.maxY || 1,
            speed: options.speed || 2, // pixels per frame
            bufferSize: 500,
            ...options
        };

        this.data = new Array(this.options.bufferSize).fill(0);
        this.resize();
        
        // Handle resize
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const parent = this.canvas.parentElement;
        this.canvas.width = parent.clientWidth;
        this.canvas.height = parent.clientHeight;
        
        // Update buffer size based on width and speed
        const neededBuffer = Math.ceil(this.canvas.width / this.options.speed);
        if (neededBuffer > this.data.length) {
            const newArray = new Array(neededBuffer).fill(0);
            for(let i=0; i<this.data.length; i++) {
                newArray[newArray.length - this.data.length + i] = this.data[i];
            }
            this.data = newArray;
        }
    }

    pushData(val) {
        this.data.push(val);
        if (this.data.length > this.canvas.width / this.options.speed) {
            this.data.shift();
        }
    }

    setColor(color) {
        this.options.color = color;
    }

    render() {
        const { width, height } = this.canvas;
        const ctx = this.ctx;

        ctx.clearRect(0, 0, width, height);

        // Draw grid
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < height; i += 20) {
            ctx.moveTo(0, i);
            ctx.lineTo(width, i);
        }
        for (let i = 0; i < width; i += 40) {
            ctx.moveTo(i, 0);
            ctx.lineTo(i, height);
        }
        ctx.stroke();

        // Draw waveform
        ctx.beginPath();
        ctx.strokeStyle = this.options.color;
        ctx.lineWidth = this.options.lineWidth;
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.options.color;

        const range = this.options.maxY - this.options.minY;
        const scaleY = height / range;
        const offsetY = height - (0 - this.options.minY) * scaleY;

        for (let i = 0; i < this.data.length; i++) {
            const x = i * this.options.speed;
            const y = height - ((this.data[i] - this.options.minY) * scaleY);
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.stroke();
    }
}

window.WaveformChart = WaveformChart;
