function Glass(canvas) {
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
  this.width = 200;  // 杯子宽度
  this.height = 300; // 杯子高度
  
  // 获取系统信息以得到屏幕尺寸
  const systemInfo = wx.getSystemInfoSync();
  
  // 计算杯子在屏幕中央的位置
  this.x = (systemInfo.windowWidth - this.width) / 2;
  this.y = (systemInfo.windowHeight - this.height) / 2;
}

Glass.prototype.render = function() {
  const ctx = this.ctx;
  
  // 保存当前上下文状态
  ctx.save();
  
  // 设置透明度以模拟玻璃效果
  ctx.globalAlpha = 0.6;
  
  // 绘制杯身（梯形）
  ctx.beginPath();
  ctx.moveTo(this.x, this.y);  // 左上角
  ctx.lineTo(this.x + this.width, this.y);  // 右上角
  ctx.lineTo(this.x + this.width * 0.8, this.y + this.height);  // 右下角
  ctx.lineTo(this.x + this.width * 0.2, this.y + this.height);  // 左下角
  ctx.closePath();
  
  // 设置渐变来增加玻璃质感
  const gradient = ctx.createLinearGradient(this.x, this.y, this.x + this.width, this.y);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0.9)');
  
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // 添加高光效果
  ctx.beginPath();
  ctx.moveTo(this.x + this.width * 0.2, this.y);
  ctx.lineTo(this.x + this.width * 0.3, this.y + this.height * 0.9);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // 恢复上下文状态
  ctx.restore();
};

module.exports = Glass;
