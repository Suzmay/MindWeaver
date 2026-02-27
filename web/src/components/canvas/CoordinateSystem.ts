export class CoordinateSystem {
  private zoom: number;
  private pan: { x: number; y: number };

  constructor(zoom: number = 1, pan: { x: number; y: number } = { x: 0, y: 0 }) {
    this.zoom = zoom;
    this.pan = pan;
  }

  // 获取当前缩放级别
  getZoom(): number {
    return this.zoom;
  }

  // 设置缩放级别（带边界限制）
  setZoom(zoom: number): void {
    this.zoom = Math.max(0.1, Math.min(3, zoom));
  }

  // 获取当前平移位置
  getPan(): { x: number; y: number } {
    return { ...this.pan };
  }

  // 设置平移位置
  setPan(pan: { x: number; y: number }): void {
    this.pan = { ...pan };
  }

  // 将屏幕坐标转换为画布坐标
  screenToCanvas(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.pan.x) / this.zoom,
      y: (screenY - this.pan.y) / this.zoom,
    };
  }

  // 将画布坐标转换为屏幕坐标
  canvasToScreen(canvasX: number, canvasY: number): { x: number; y: number } {
    return {
      x: canvasX * this.zoom + this.pan.x,
      y: canvasY * this.zoom + this.pan.y,
    };
  }

  // 围绕特定点应用缩放
  zoomAround(point: { x: number; y: number }, delta: number): void {
    const newZoom = Math.max(0.1, Math.min(3, this.zoom * delta));
    const scaleFactor = newZoom / this.zoom;

    // 调整平移以保持点在屏幕上的相同位置
    this.pan.x = point.x - (point.x - this.pan.x) * scaleFactor;
    this.pan.y = point.y - (point.y - this.pan.y) * scaleFactor;
    this.zoom = newZoom;
  }

  // 按偏移量平移
  panBy(deltaX: number, deltaY: number): void {
    this.pan.x += deltaX;
    this.pan.y += deltaY;
  }

  // 重置到默认视图
  reset(): void {
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
  }

  // 获取画布坐标中可见区域的边界
  getVisibleBounds(viewportWidth: number, viewportHeight: number): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const topLeft = this.screenToCanvas(0, 0);
    const bottomRight = this.screenToCanvas(viewportWidth, viewportHeight);
    
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    };
  }

  // 检查点是否在可见区域内
  isPointVisible(
    point: { x: number; y: number },
    viewportWidth: number,
    viewportHeight: number
  ): boolean {
    const bounds = this.getVisibleBounds(viewportWidth, viewportHeight);
    return (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    );
  }

  // 检查矩形是否在可见区域内或与可见区域相交
  isRectangleVisible(
    rect: { x: number; y: number; width: number; height: number },
    viewportWidth: number,
    viewportHeight: number
  ): boolean {
    const bounds = this.getVisibleBounds(viewportWidth, viewportHeight);
    
    return (
      rect.x + rect.width >= bounds.x &&
      rect.x <= bounds.x + bounds.width &&
      rect.y + rect.height >= bounds.y &&
      rect.y <= bounds.y + bounds.height
    );
  }
}
