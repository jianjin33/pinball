function Ball(canvas, glass) {
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
  this.glass = glass;
  
  this.radius = 15;           // 小球半径
  this.gravity = 0.5;         // 增加重力
  this.bounce = 0.95;         // 非常高的弹性系数
  this.friction = 0.995;      // 几乎没有摩擦力
  this.maxSpeed = 15;         // 增加最大速度限制
  this.energyBoost = 1.01;    // 碰撞时的能量提升因子
  this.scoreValue = 1;        // 小球的分数值，默认为1
  
  // 延迟重生相关属性
  this.needsRespawn = false;    // 是否需要重生
  this.respawnTimer = 0;        // 重生倒计时（帧数）
  this.respawnDelayFrames = 90; // 重生延迟（3秒，假设60fps）
  this.isVisible = true;        // 是否可见
  this.shouldRespawn = true;    // 是否应该重生，默认为true
  
  // 获取系统信息以得到屏幕尺寸
  const systemInfo = wx.getSystemInfoSync();
  
  // 初始化小球位置在顶部中央
  this.x = systemInfo.windowWidth / 2;
  this.y = this.radius * 2;
  
  // 初始速度
  this.velocityX = 3;        // 增加初始水平速度
  this.velocityY = 0;        // 垂直速度初始为0
}

Ball.prototype.update = function() {
  // 应用重力
  this.velocityY += this.gravity;
  
  // 应用非常小的摩擦力
  this.velocityX *= this.friction;
  this.velocityY *= this.friction;
  
  // 确保速度永远不会太小
  const minSpeed = 2;
  const currentSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
  if (currentSpeed < minSpeed) {
    const scale = minSpeed / currentSpeed;
    this.velocityX *= scale;
    this.velocityY *= scale;
  }
  
  // 限制最大速度
  const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
  if (speed > this.maxSpeed) {
    const scale = this.maxSpeed / speed;
    this.velocityX *= scale;
    this.velocityY *= scale;
  }
  
  // 更新位置
  this.x += this.velocityX;
  this.y += this.velocityY;
  
  // 获取系统信息来获取屏幕边界
  const systemInfo = wx.getSystemInfoSync();
  const screenWidth = systemInfo.windowWidth;
  const screenHeight = systemInfo.windowHeight;
  
  // 碰撞检测 - 屏幕左右边界
  if (this.x - this.radius < 0 || this.x + this.radius > screenWidth) {
    // 碰到左右边界，标记为需要重生
    if (!this.needsRespawn) {
      this.needsRespawn = true;
      this.respawnTimer = 0;
      this.isVisible = false; // 隐藏小球
    }
  }
  
  // 上边界碰撞
  if (this.y - this.radius < 0) {
    this.y = this.radius;
    this.velocityY = Math.abs(this.velocityY) * this.bounce * this.energyBoost;
  }
  
  // 处理延迟重生逻辑
  if (this.needsRespawn) {
    // 增加重生计时器
    this.respawnTimer++;
    
    // 如果达到延迟时间且小球应该重生，执行重生
    if (this.respawnTimer >= this.respawnDelayFrames && this.shouldRespawn) {
      this.respawn(screenWidth, screenHeight);
    }
  }
  
  // 如果球掉出屏幕底部，标记为需要重生
  if (this.y > screenHeight + this.radius && !this.needsRespawn) {
    this.needsRespawn = true;
    this.respawnTimer = 0;
    this.isVisible = false; // 隐藏小球
  }
  
  // 与玻璃杯的碰撞检测
  if (this.y + this.radius > this.glass.y && 
      this.y - this.radius < this.glass.y + this.glass.height) {
    
    // 计算杯子当前高度的宽度（梯形）
    const progress = (this.y - this.glass.y) / this.glass.height;
    const leftBound = this.glass.x + (this.glass.width * 0.2) * progress;
    const rightBound = this.glass.x + this.glass.width - (this.glass.width * 0.2) * progress;
    
    // 检测与杯壁的碰撞
    if (this.x + this.radius > leftBound && this.x - this.radius < rightBound) {
      // 左壁碰撞
      if (this.x - this.radius < leftBound && this.velocityX < 0) {
        this.x = leftBound + this.radius;
        this.velocityX = -this.velocityX * this.bounce * this.energyBoost;
        // 增加一些垂直速度来使运动更有趣
        this.velocityY = this.velocityY * this.bounce - 2;
      }
      // 右壁碰撞
      if (this.x + this.radius > rightBound && this.velocityX > 0) {
        this.x = rightBound - this.radius;
        this.velocityX = -this.velocityX * this.bounce * this.energyBoost;
        // 增加一些垂直速度来使运动更有趣
        this.velocityY = this.velocityY * this.bounce - 2;
      }
      // 底部碰撞
      const bottom = this.glass.y + this.glass.height;
      if (this.y + this.radius > bottom && this.velocityY > 0) {
        this.y = bottom - this.radius;
        this.velocityY = -this.velocityY * this.bounce * this.energyBoost;
        this.velocityX = this.velocityX * this.bounce;
      }
    }
  }
};

/**
 * 小球重生方法
 */
Ball.prototype.respawn = function(screenWidth, screenHeight) {
  // 重置位置到顶部中央
  this.y = this.radius * 2;
  this.x = screenWidth / 2;
  
  // 重置速度
  this.velocityX = (Math.random() > 0.5 ? 3 : -3); // 随机方向
  this.velocityY = 0;
  
  // 重置重生状态
  this.needsRespawn = false;
  this.isVisible = true;
  
  // 保留分数值
  // scoreValue保持不变
};

/**
 * 绘制小球
 */
Ball.prototype.render = function() {
  // 只有当小球可见时才绘制
  if (!this.isVisible) return;
  
  const ctx = this.ctx;
  ctx.save();
  
  // 绘制小球
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
  
  // 设置填充颜色
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  
  // 添加边框
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // 在小球上绘制分数值
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(this.scoreValue.toString(), this.x, this.y);
  
  ctx.restore();
};

module.exports = Ball;
