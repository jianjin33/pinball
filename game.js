// 引入游戏组件
const Glass = require('./js/glass');
const Ball = require('./js/ball');

// 创建画布和上下文
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

// 调试日志，检查Canvas创建状态
console.log('Canvas初始化结果:', canvas);

/**
 * 游戏主类
 * 负责初始化游戏环境、创建游戏对象和管理游戏循环
 */
function PinballGame() {
  // 游戏对象引用
  this.glass = null;
  this.balls = [];  // 使用数组存储多个小球
  
  // 游戏状态
  this.isRunning = false;
  
  // 按钮相关属性
  this.addBallButton = null;
  this.mergeBallButton = null;
  
  // 分数系统
  this.score = 0;         // 当前分数
  this.scoreMultiplier = 1; // 碰撞分数倍数
  this.maxScore = 1000000; // 进度条满格分数
  this.currentAddBallLevel = 1; // 当前加球档次，默认为1
  
  // 初始化游戏
  this.init();
}

/**
   * 初始化游戏环境和对象
   */
  PinballGame.prototype.init = function() {
    try {
      // 获取系统信息并设置画布尺寸
      const systemInfo = wx.getSystemInfoSync();
      console.log('系统信息:', systemInfo);
      
      // 强制设置Canvas尺寸，确保在所有设备上都能正确显示
      canvas.width = systemInfo.windowWidth;
      canvas.height = systemInfo.windowHeight;
      
      console.log('Canvas尺寸设置为:', canvas.width, 'x', canvas.height);
      
      // 创建玻璃杯实例
      this.glass = new Glass(canvas);
      
      // 创建按钮实例
      this.initButtons(systemInfo);
      
      // 创建初始小球实例
      this.createBall();
      
      // 绑定触摸事件
      this.bindEvents();
      
      // 立即渲染一帧，确保初始画面显示
      this.render();
      
      // 开始游戏循环
      this.startGame();
    } catch (error) {
      console.error('游戏初始化错误:', error);
    }
  };

/**
 * 初始化按钮
 */
PinballGame.prototype.initButtons = function(systemInfo) {
  const buttonWidth = 120;
  const buttonHeight = 50;
  const buttonGap = 40;
  const bottomPadding = 120; // 增大底部内边距，使按钮距离底部更远
  
  // 计算按钮位置（屏幕下方水平放置）
  const totalWidth = buttonWidth * 2 + buttonGap;
  const startX = (systemInfo.windowWidth - totalWidth) / 2;
  const buttonY = systemInfo.windowHeight - bottomPadding;
  
  // 创建加球按钮
  this.addBallButton = {
    x: startX,
    y: buttonY,
    width: buttonWidth,
    height: buttonHeight,
    text: '加球',
    color: '#4CAF50',
    active: true
  };
  
  // 创建合球按钮
  this.mergeBallButton = {
    x: startX + buttonWidth + buttonGap,
    y: buttonY,
    width: buttonWidth,
    height: buttonHeight,
    text: '合球',
    color: '#FF9800',
    active: false
  };
};

/**
   * 创建一个新的小球，从顶部掉落进杯子
   */
  /**
   * 创建一个新的小球，从顶部掉落进杯子
   * 当最高档的球比最低档的球高3档时，新添加的球分数档位向上加一级
   */
  PinballGame.prototype.createBall = function() {
    const systemInfo = wx.getSystemInfoSync();
    const newBall = new Ball(canvas, this.glass);
    
    // 初始化或获取当前加球档次
    this.currentAddBallLevel = this.currentAddBallLevel || 1;
    
    // 设置新球的分数为当前加球档次
    newBall.scoreValue = this.currentAddBallLevel;
    
    // 检查是否需要调整加球档次
    if (this.balls.length > 0) {
      // 找出当前所有球的最低和最高分数
      let minScore = Infinity;
      let maxScore = 0;
      
      this.balls.forEach(ball => {
        if (ball.scoreValue < minScore) minScore = ball.scoreValue;
        if (ball.scoreValue > maxScore) maxScore = ball.scoreValue;
      });
      
      // 判断最高档的球是否比当前加球档次高3档
      // 这里假设分数档位是按照几何级数增长的，每一档是前一档的2倍
      // 例如：1, 2, 4, 8, 16, 32...
      const levelDifference = Math.log2(maxScore / this.currentAddBallLevel);
      
      if (levelDifference >= 3) {
        // 如果满足条件，加球档次向上加一级
        this.currentAddBallLevel *= 2;
        newBall.scoreValue = this.currentAddBallLevel;
      }
    }
    
    // 从顶部掉落的位置（杯子上方）
    newBall.x = this.glass.x + this.glass.width / 2; // 杯子中心上方
    newBall.y = 50; // 屏幕顶部附近
    
    // 初始速度（向下掉落）
    newBall.velocityX = (Math.random() - 0.5) * 2; // 轻微水平随机
    newBall.velocityY = 3; // 向下的初始速度
    
    this.balls.push(newBall);
    
    // 更新合球按钮状态
    this.mergeBallButton.active = this.hasMergeableBalls();
  };

/**
 * 合并小球，只允许合并两个分数相同的球
 * 优先合并分数最小且相同的两个球
 * 合并后的球分数为之前两个球的分数之和，大小不变
 */
/**
   * 合并小球，只允许合并两个分数相同的球
   * 优先合并分数最小且相同的两个球
   * 合并后的球分数为之前两个球的分数之和，大小不变
   * 合并后检测是否需要提高加球档次
   */
  PinballGame.prototype.mergeBalls = function() {
  if (this.balls.length < 2) return;
  
  // 按分数值排序小球
  const sortedBalls = [...this.balls].sort((a, b) => a.scoreValue - b.scoreValue);
  
  // 找到两个分数相同且最小的球
  let ball1 = null;
  let ball2 = null;
  let minScore = Infinity;
  
  // 只寻找相同分数的球
  for (let i = 0; i < sortedBalls.length - 1; i++) {
    if (sortedBalls[i].scoreValue === sortedBalls[i + 1].scoreValue && sortedBalls[i].scoreValue < minScore) {
      ball1 = sortedBalls[i];
      ball2 = sortedBalls[i + 1];
      minScore = sortedBalls[i].scoreValue;
    }
  }
  
  // 如果找到了可以合并的球
  if (ball1 && ball2) {
    // 计算合并后的位置（两个球的中心）
    const mergedX = (ball1.x + ball2.x) / 2;
    const mergedY = (ball1.y + ball2.y) / 2;
    
    // 创建一个新的球，大小不变
    const mergedBall = new Ball(canvas, this.glass);
    mergedBall.x = mergedX;
    mergedBall.y = mergedY;
    mergedBall.radius = ball1.radius; // 保持大小不变
    mergedBall.scoreValue = ball1.scoreValue + ball2.scoreValue; // 分数相加
    
    // 从数组中移除被合并的两个球
    const index1 = this.balls.indexOf(ball1);
    const index2 = this.balls.indexOf(ball2);
    
    if (index1 !== -1 && index2 !== -1) {
      // 先移除较大的索引，避免索引变化
      const firstIndex = Math.min(index1, index2);
      const secondIndex = Math.max(index1, index2);
      
      this.balls.splice(secondIndex, 1);
      this.balls.splice(firstIndex, 1);
      
      // 添加合并后的球
      this.balls.push(mergedBall);
    }
    
    // 合并后检查是否需要提高加球档次
    this.checkAndAdjustAddBallLevel();
    
    // 更新合球按钮状态
    this.mergeBallButton.active = this.hasMergeableBalls();
  }
};
  
  /**
   * 检查并调整加球档次
   * 当最高档的球比当前加球档次高3档时，提高加球档次
   */
  PinballGame.prototype.checkAndAdjustAddBallLevel = function() {
    if (this.balls.length === 0) return;
    
    // 获取当前所有球的最高分数
    let maxScore = 0;
    this.balls.forEach(ball => {
      if (ball.scoreValue > maxScore) maxScore = ball.scoreValue;
    });
    
    // 初始化当前加球档次（如果尚未初始化）
    this.currentAddBallLevel = this.currentAddBallLevel || 1;
    
    // 判断最高档的球是否比当前加球档次高3档
    const levelDifference = Math.log2(maxScore / this.currentAddBallLevel);
    
    if (levelDifference >= 3) {
      // 如果满足条件，加球档次向上加一级
      this.currentAddBallLevel *= 2;
      
      // 移除所有比当前加球档次低的球（设置为不重生）
      for (let i = this.balls.length - 1; i >= 0; i--) {
        if (this.balls[i].scoreValue < this.currentAddBallLevel) {
          // 标记这些球不再重生
          this.balls[i].shouldRespawn = false;
        }
      }
    }
  };

/**
 * 绑定触摸事件以实现用户交互
 * 在微信小游戏环境中使用wx.onTouchStart代替canvas.addEventListener
 */
PinballGame.prototype.bindEvents = function() {
  // 保存this引用，以便在事件回调中使用
  const self = this;
  
  // 使用微信小游戏的触摸事件API
  wx.onTouchStart(function(e) {
    const touch = e.touches[0];
    
    // 获取触摸点相对于Canvas的坐标
    // 微信小游戏中的触摸坐标已经是相对于Canvas的，不需要额外转换
    const touchX = touch.clientX;
    const touchY = touch.clientY;
    
    // 检查是否点击了加球按钮
    if (self.addBallButton.active && 
        touchX >= self.addBallButton.x && 
        touchX <= self.addBallButton.x + self.addBallButton.width &&
        touchY >= self.addBallButton.y && 
        touchY <= self.addBallButton.y + self.addBallButton.height) {
      self.createBall();
      return;
    }
    
    // 检查是否点击了合球按钮
    if (self.mergeBallButton.active && 
        touchX >= self.mergeBallButton.x && 
        touchX <= self.mergeBallButton.x + self.mergeBallButton.width &&
        touchY >= self.mergeBallButton.y && 
        touchY <= self.mergeBallButton.y + self.mergeBallButton.height) {
      self.mergeBalls();
      return;
    }
    
    // 检查是否点击了小球附近，给小球推动力
    self.balls.forEach(ball => {
      const dx = touchX - ball.x;
      const dy = touchY - ball.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 100) {
        const force = 3;
        ball.velocityX += (dx / distance) * force;
        ball.velocityY += (dy / distance) * force;
      }
    });
  });
};

/**
 * 启动游戏循环
 */
PinballGame.prototype.startGame = function() {
  this.isRunning = true;
  
  // 保存this引用，避免绑定问题
  const self = this;
  
  // 定义游戏循环函数
  function gameLoop() {
    if (!self.isRunning) return;
    
    try {
      // 更新游戏状态
      self.update();
      
      // 渲染游戏画面
      self.render();
      
      // 请求下一帧
      requestAnimationFrame(gameLoop);
    } catch (error) {
      console.error('游戏循环错误:', error);
      // 即使出错也继续请求下一帧，避免游戏完全停止
      if (self.isRunning) {
        requestAnimationFrame(gameLoop);
      }
    }
  }
  
  // 启动游戏循环
  gameLoop();
  console.log('游戏循环已启动');
};

/**
 * 游戏主循环（已在startGame中重新实现，保留此方法以保持兼容性）
 * 负责更新游戏状态和渲染游戏画面
 */
PinballGame.prototype.gameLoop = function() {
  if (!this.isRunning) return;
  
  // 更新游戏状态
  this.update();
  
  // 渲染游戏画面
  this.render();
};

/**
   * 更新游戏状态
   */
  /**
   * 检查是否存在可以合并的球（至少有两个相同分数的球）
   */
  PinballGame.prototype.hasMergeableBalls = function() {
    if (this.balls.length < 2) return false;
    
    // 统计每个分数值出现的次数
    const scoreCount = {};
    
    for (let i = 0; i < this.balls.length; i++) {
      const score = this.balls[i].scoreValue;
      scoreCount[score] = (scoreCount[score] || 0) + 1;
      
      // 如果发现某个分数出现至少两次，说明有可合并的球
      if (scoreCount[score] >= 2) {
        return true;
      }
    }
    
    return false;
  };
  
  /**
   * 更新游戏状态
   */
  PinballGame.prototype.update = function() {
    // 更新所有小球状态
    this.balls.forEach(ball => {
      ball.update();
    });
    
    // 检测并处理小球之间的碰撞
    this.checkBallCollisions();
    
    // 更新合球按钮状态，只有当存在可合并的球时才启用
    this.mergeBallButton.active = this.hasMergeableBalls();
  };
  
  /**
   * 检测并处理小球之间的碰撞
   */
  PinballGame.prototype.checkBallCollisions = function() {
    const balls = this.balls;
    
    // 检查每对小球之间的碰撞
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const ball1 = balls[i];
        const ball2 = balls[j];
        
        // 计算两球之间的距离
        const dx = ball2.x - ball1.x;
        const dy = ball2.y - ball1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 判断是否发生碰撞（距离小于两球半径之和）
        if (distance < ball1.radius + ball2.radius) {
          // 防止小球重叠
          this.resolveOverlap(ball1, ball2, dx, dy, distance);
          
          // 处理碰撞响应
          this.resolveCollision(ball1, ball2, dx, dy, distance);
        }
      }
    }
  };
  
  /**
   * 解决小球之间的重叠问题
   */
  PinballGame.prototype.resolveOverlap = function(ball1, ball2, dx, dy, distance) {
    // 计算重叠部分的大小
    const overlap = ball1.radius + ball2.radius - distance;
    
    // 如果完全重叠，给一个微小的位移
    const minDistance = 0.001;
    if (distance < minDistance) {
      // 随机方向推开
      const angle = Math.random() * Math.PI * 2;
      ball1.x -= Math.cos(angle) * overlap * 0.5;
      ball1.y -= Math.sin(angle) * overlap * 0.5;
      ball2.x += Math.cos(angle) * overlap * 0.5;
      ball2.y += Math.sin(angle) * overlap * 0.5;
    } else {
      // 按比例推开两个球
      const ratio1 = ball2.radius / (ball1.radius + ball2.radius);
      const ratio2 = ball1.radius / (ball1.radius + ball2.radius);
      
      ball1.x -= (dx / distance) * overlap * ratio1;
      ball1.y -= (dy / distance) * overlap * ratio1;
      ball2.x += (dx / distance) * overlap * ratio2;
      ball2.y += (dy / distance) * overlap * ratio2;
    }
  };
  
  /**
   * 处理小球之间的碰撞响应
   */
  PinballGame.prototype.resolveCollision = function(ball1, ball2, dx, dy, distance) {
    // 增加分数（基于两个球的分数之和）
    const collisionScore = (ball1.scoreValue + ball2.scoreValue) * this.scoreMultiplier;
    this.addScore(collisionScore);
    
    // 归一化碰撞方向向量
    const nx = dx / distance;
    const ny = dy / distance;
    
    // 计算相对速度
    const dvx = ball2.velocityX - ball1.velocityX;
    const dvy = ball2.velocityY - ball1.velocityY;
    
    // 计算相对速度在碰撞方向上的投影
    const velocityAlongNormal = dvx * nx + dvy * ny;
    
    // 如果小球正在分离，不需要处理碰撞
    if (velocityAlongNormal > 0) return;
    
    // 使用动量守恒和能量守恒计算碰撞后的速度变化
    const e = 0.9; // 弹性系数
    const m1 = ball1.radius * ball1.radius; // 用半径平方近似质量
    const m2 = ball2.radius * ball2.radius;
    
    // 计算冲量
    const j = -(1 + e) * velocityAlongNormal / (1/m1 + 1/m2);
    
    // 应用冲量到两个小球
    const impulseX = j * nx;
    const impulseY = j * ny;
    
    ball1.velocityX -= (impulseX / m1) * m1; // 动量变化
    ball1.velocityY -= (impulseY / m1) * m1;
    ball2.velocityX += (impulseX / m2) * m2;
    ball2.velocityY += (impulseY / m2) * m2;
    
    // 限制最大速度
    this.limitBallSpeed(ball1);
    this.limitBallSpeed(ball2);
  };
  
  /**
   * 限制小球的最大速度
   */
  PinballGame.prototype.limitBallSpeed = function(ball) {
    const speed = Math.sqrt(ball.velocityX * ball.velocityX + ball.velocityY * ball.velocityY);
    if (speed > ball.maxSpeed) {
      const scale = ball.maxSpeed / speed;
      ball.velocityX *= scale;
      ball.velocityY *= scale;
    }
  };

/**
   * 增加分数，允许分数无限制增长
   * 进度条会在达到最大值后保持100%显示
   */
  PinballGame.prototype.addScore = function(points) {
    this.score += points;
    // 移除分数上限，允许分数无限增长
  };
  
  /**
   * 渲染分数显示
   */
  PinballGame.prototype.renderScore = function() {
    ctx.save();
    
    // 计算进度百分比
    const progress = Math.min(this.score / this.maxScore, 1);
    
    // 绘制分数文本 - 位置向下调整，避免被刘海屏挡住
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('分数: ' + this.score.toLocaleString(), canvas.width / 2, 60);
    
    // 绘制目标分数文本
    ctx.font = '16px sans-serif';
    ctx.fillText('目标: ' + this.maxScore.toLocaleString(), canvas.width / 2, 85);
    
    // 绘制进度条背景 - 位置向下调整，与目标分数文本不重叠
    const progressBarWidth = canvas.width * 0.8;
    const progressBarHeight = 15;
    const progressBarX = (canvas.width - progressBarWidth) / 2;
    const progressBarY = 110;
    
    ctx.fillStyle = '#444444';
    ctx.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);
    
    // 绘制进度条填充
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(progressBarX, progressBarY, progressBarWidth * progress, progressBarHeight);
    
    // 绘制进度条边框
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);
    
    // 绘制进度百分比文本
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(progress * 100) + '%', canvas.width / 2, progressBarY + progressBarHeight / 2);
    
    ctx.restore();
  };
  
  /**
   * 渲染游戏画面
   */
  PinballGame.prototype.render = function() {
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制背景
    ctx.fillStyle = '#1a4a7a'; // 深蓝色背景
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制分数和进度条
    this.renderScore();
    
    // 绘制玻璃杯
    this.glass.render();
    
    // 绘制所有小球
    this.balls.forEach(ball => {
      ball.render();
    });
    
    // 绘制按钮
    this.renderButton(this.addBallButton);
    this.renderButton(this.mergeBallButton);
  };

/**
 * 渲染按钮
 */
PinballGame.prototype.renderButton = function(button) {
  ctx.save();
  
  // 设置按钮样式
  ctx.fillStyle = button.active ? button.color : '#cccccc';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  
  // 绘制按钮圆角矩形
  ctx.beginPath();
  const radius = 8;
  ctx.moveTo(button.x + radius, button.y);
  ctx.lineTo(button.x + button.width - radius, button.y);
  ctx.quadraticCurveTo(button.x + button.width, button.y, button.x + button.width, button.y + radius);
  ctx.lineTo(button.x + button.width, button.y + button.height - radius);
  ctx.quadraticCurveTo(button.x + button.width, button.y + button.height, button.x + button.width - radius, button.y + button.height);
  ctx.lineTo(button.x + radius, button.y + button.height);
  ctx.quadraticCurveTo(button.x, button.y + button.height, button.x, button.y + button.height - radius);
  ctx.lineTo(button.x, button.y + radius);
  ctx.quadraticCurveTo(button.x, button.y, button.x + radius, button.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // 绘制按钮文字
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(button.text, button.x + button.width / 2, button.y + button.height / 2);
  
  ctx.restore();
};

/**
 * 停止游戏
 */
PinballGame.prototype.stopGame = function() {
  this.isRunning = false;
};

// 创建游戏实例，启动游戏
const game = new PinballGame();

// 导出游戏实例供外部访问（可选）
module.exports = game;