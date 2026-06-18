import { ContentBlock } from "./data-service";

/**
 * D2L 教材专用过滤器 (强化版 v3)
 * 
 * 目标：只保留 PyTorch 兼容的代码块，彻底过滤 MXNet/TensorFlow/Paddle
 */
export function filterBlocksForPyTorch(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.filter(block => {
    // 保留所有 Markdown 块
    if (block.type !== 'code') return true;

    const content = block.content.trim();
    if (!content) return true; // 空代码块保留
    
    const firstLine = content.split('\n')[0].trim();

    // ========================================
    // 1. 检查 #@tab 标记 (最高优先级)
    // ========================================
    if (firstLine.startsWith('#@tab')) {
      const tags = firstLine.replace('#@tab', '').split(',').map(t => t.trim().toLowerCase());
      
      // 只保留标记为 pytorch 或 all 的块
      if (tags.includes('pytorch') || tags.includes('all')) {
        return true;
      }
      // 丢弃 mxnet, tensorflow, paddle, jax 等
      return false; 
    }

    // ========================================
    // 2. 强力关键词过滤 (杀掉 MXNet/TF/Paddle)
    // ========================================
    
    // --- MXNet 特征 ---
    if (
        content.includes('from d2l import mxnet') ||
        content.includes('d2l.mxnet') ||
        content.includes('import mxnet') ||
        content.includes('from mxnet') ||
        content.includes('nn.Block') ||           // MXNet 基类
        content.includes('npx.set_np') ||         // MXNet 配置
        content.includes('npx.') ||               // MXNet npx 模块
        content.includes('.initialize()') ||     // MXNet 初始化方法 (PyTorch 没有!)
        content.includes('autograd.record') ||   // MXNet autograd
        content.includes('np.random.uniform') || // MXNet 的 np.random (不是 numpy!)
        content.includes('np.random.normal')     // MXNet 的 np.random
       ) {
      return false;
    }
    
    // --- TensorFlow 特征 ---
    if (
        content.includes('from d2l import tensorflow') ||
        content.includes('d2l.tensorflow') ||
        content.includes('import tensorflow') ||
        content.includes('from tensorflow') ||
        content.includes('tf.') ||
        content.includes('tf.keras') ||
        content.includes('tf.constant') ||
        content.includes('tf.ones') ||
        content.includes('tf.zeros')
       ) {
      return false;
    }
    
    // --- Paddle 特征 ---
    if (
        content.includes('from d2l import paddle') ||
        content.includes('d2l.paddle') ||
        content.includes('import paddle') ||
        content.includes('from paddle') ||
        content.includes('paddle.') ||
        content.includes('nn.Layer')              // Paddle 基类
       ) {
      return false;
    }

    // ========================================
    // 3. 类定义智能过滤
    // ========================================
    // 如果是类定义，且没有 @tab 标记，检查是否继承 nn.Module
    if (content.includes('class ') && !firstLine.startsWith('#@tab')) {
      // PyTorch 的类继承 nn.Module
      // MXNet 的类继承 nn.Block
      // TensorFlow 的类继承 tf.keras.layers.Layer
      // Paddle 的类继承 nn.Layer
      
      // 如果代码包含 class 定义，但不包含 nn.Module，大概率不是 PyTorch
      if (!content.includes('nn.Module')) {
        return false;
      }
    }

    // ========================================
    // 4. 函数调用风格过滤
    // ========================================
    // MXNet 风格的调用（没有 @tab 标记的独立调用代码）
    if (!firstLine.startsWith('#@tab')) {
      // .initialize() 是 MXNet 专属
      if (content.match(/\w+\.initialize\(\)/)) {
        return false;
      }
      
      // 检查是否是测试/调用代码块（通常很短，只有几行）
      const lines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
      if (lines.length <= 5) {
        // 短代码块，检查是否包含 MXNet 风格的调用
        
        // 检查 np.ones, np.zeros (MXNet 的 np，不是 numpy)
        // 在 PyTorch 环境中，应该用 torch.ones 或 d2l.ones
        if (content.includes('np.ones(') || content.includes('np.zeros(')) {
          // 如果同时包含 torch 或 d2l，可能是混用，保留
          if (!content.includes('torch') && !content.includes('d2l.')) {
            return false;
          }
        }
      }
    }

    // 默认保留（通用 Python 代码，如 import math）
    return true;
  });
}
