/**
 * 工业级性能 & 震撼交互：SVG 下雪特效 (点击爆散增强版)
 * 优化点：
 * 1. 离屏缓存 (Porter Mode)：极致省电。
 * 2. 鼠标排斥：自然的物理避让。
 * 3. 🌟 点击爆散 (New)：震撼的视觉冲击力。
 */
class SnowFall {
  constructor(options = {}) {
    this.maxFlakes = options.maxFlakes || 60; 
    this.wind = options.wind || 0.5;
    this.imageSrc = options.imageSrc || 'js/snow.svg'; 
    
    // 交互配置
    this.mouseRadius = options.mouseRadius || 100;   // 鼠标避让范围
    this.mouseStrength = options.mouseStrength || 5; // 鼠标避让强度
    this.burstRadius = options.burstRadius || 300;   // 🌟 爆散影响范围
    this.burstStrength = options.burstStrength || 30;// 🌟 爆散初始强度

    this.flakes = [];
    this.animationId = null;
    this.snowImage = new Image();
    this.offscreenCanvas = null;

    // 状态跟踪
    this.mouse = { x: -1000, y: -1000, active: false };
    this.bursts = []; // 🌟 存放当前活跃的爆散能量场

    this.init();
  }

  init() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; pointer-events:none; z-index:9999;";
    document.body.appendChild(this.canvas);

    this.resize();
    window.addEventListener('resize', () => this.resize());

    // 绑定交互事件
    this.bindEvents();

    this.snowImage.onload = () => {
      this.cacheSVG();
      this.createFlakes();
      this.start();
    };
    this.snowImage.src = this.imageSrc;
  }

  bindEvents() {
    // 鼠标移动
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.active = true;
    });
    window.addEventListener('mouseleave', () => this.mouse.active = false);

    // 🌟 鼠标点击：产生爆散能量场
    // 注意：因为 canvas 设为了 pointer-events: none，我们需要监听 window
    window.addEventListener('mousedown', (e) => {
      this.triggerBurst(e.clientX, e.clientY);
    });
  }

  // 🌟 触发爆散逻辑
  triggerBurst(x, y) {
    this.bursts.push({
      x: x,
      y: y,
      startTime: Date.now(),
      duration: 500 // 爆散持续 500 毫秒
    });
  }

  cacheSVG() {
    this.offscreenCanvas = document.createElement('canvas');
    const size = 100;
    this.offscreenCanvas.width = size;
    this.offscreenCanvas.height = size;
    const offCtx = this.offscreenCanvas.getContext('2d');
    offCtx.drawImage(this.snowImage, 0, 0, size, size);
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  createFlakes() {
    this.flakes = [];
    for (let i = 0; i < this.maxFlakes; i++) {
      this.flakes.push(new Snowflake(this.width, this.height));
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 🌟 清理已经过期的爆散场
    const now = Date.now();
    this.bursts = this.bursts.filter(b => now - b.startTime < b.duration);

    for (let flake of this.flakes) {
      // 传入鼠标状态和活跃的爆散场
      flake.update(this.width, this.height, this.wind, this.mouse, this);
      flake.draw(this.ctx, this.offscreenCanvas); 
    }

    this.animationId = requestAnimationFrame(() => this.draw());
  }

  start() { if (!this.animationId) this.draw(); }
}

class Snowflake {
  constructor(canvasWidth, canvasHeight) {
    this.init(canvasWidth, canvasHeight, true);
  }

  init(canvasWidth, canvasHeight, isFirstTime = false) {
    this.z = Math.random() * 0.8 + 0.2; 
    this.x = Math.random() * canvasWidth;
    this.y = isFirstTime ? Math.random() * canvasHeight : -50;
    this.size = this.z * 20 + 15; 
    this.speedY = this.z * 1 + 0.25; 
    this.swing = Math.random() * Math.PI * 2; 
    this.swingSpeed = Math.random() * 0.03 + 0.01; 
    this.swingAmplitude = this.z * 1.5; 
    this.angle = Math.random() * Math.PI * 2; 
    this.spinSpeed = (Math.random() - 0.5) * 0.05; 
    this.opacity = this.z * 0.8 + 0.2; 
  }

  update(canvasWidth, canvasHeight, wind, mouse, parent) {
    this.swing += this.swingSpeed;
    this.angle += this.spinSpeed; 
    
    let forceX = 0, forceY = 0;

    // 1. 鼠标避让逻辑
    if (mouse.active) {
      const dx = this.x - mouse.x;
      const dy = this.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < parent.mouseRadius) {
        const factor = (parent.mouseRadius - dist) / parent.mouseRadius;
        const angle = Math.atan2(dy, dx);
        forceX += Math.cos(angle) * factor * parent.mouseStrength * this.z;
        forceY += Math.sin(angle) * factor * parent.mouseStrength * this.z;
      }
    }

    // 2. 🌟 爆散逻辑：遍历当前所有活跃的爆散场
    const now = Date.now();
    parent.bursts.forEach(burst => {
      const age = now - burst.startTime;
      const lifeRatio = 1 - (age / burst.duration); // 能量随时间衰减 (1 -> 0)
      
      const dx = this.x - burst.x;
      const dy = this.y - burst.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < parent.burstRadius) {
        // 距离越近、爆发越初期，推力越大
        const factor = (parent.burstRadius - dist) / parent.burstRadius;
        const angle = Math.atan2(dy, dx);
        const strength = factor * parent.burstStrength * lifeRatio * this.z;
        forceX += Math.cos(angle) * strength;
        forceY += Math.sin(angle) * strength;
      }
    });
    
    // 应用所有力
    this.y += this.speedY + forceY; 
    this.x += wind + Math.cos(this.swing) * this.swingAmplitude + forceX;

    if (this.y > canvasHeight + this.size) this.init(canvasWidth, canvasHeight);
    if (this.x > canvasWidth + this.size) this.x = -this.size;
    if (this.x < -this.size) this.x = canvasWidth + this.size;
  }

  draw(ctx, cachedCanvas) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.globalAlpha = this.opacity;
    ctx.drawImage(cachedCanvas, -this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

// 调用
const snow = new SnowFall({ 
  maxFlakes: 50, 
  imageSrc: 'js/snow.svg',
  burstRadius: 300, // 点击波及范围
  burstStrength: 25 // 爆发力度
});