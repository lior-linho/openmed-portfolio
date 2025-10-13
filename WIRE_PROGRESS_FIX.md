# 导管进度重置问题修复

## 问题描述

用户反馈每次点击"3D Background"标签时，导管都从头开始插入，而不是保持当前的进度状态。

## 问题分析

通过代码分析发现，问题出现在 `Canvas` 组件的 `key` 属性设置上：

1. **FluoroViewport.tsx**: Canvas 使用了 `key={`fluoro-${angles.laoRaoDeg}-${angles.cranialCaudalDeg}-${zoom}`}`
2. **UnifiedScene.tsx**: Canvas 使用了 `key={`unified-${angles.laoRaoDeg}-${angles.cranialCaudalDeg}-${zoom}`}`

## 根本原因

React 的 `key` 属性用于标识组件的唯一性。当 `key` 值发生变化时，React 会：
1. 销毁旧的组件实例
2. 创建新的组件实例
3. 重新初始化所有子组件的状态

这意味着每次角度或缩放变化时，整个 Canvas 和所有子组件（包括 `SceneContents`、`DynamicWire`、`WireTip` 等）都会被重新创建，导致导管进度被重置。

## 修复方案

移除不必要的 `key` 属性，让 `CameraController` 组件来处理相机变化，而不是重新创建整个 Canvas。

### 修改前
```typescript
<Canvas 
  key={`fluoro-${angles.laoRaoDeg}-${angles.cranialCaudalDeg}-${zoom}`}
  camera={cameraConfig}
>
```

### 修改后
```typescript
<Canvas 
  camera={cameraConfig}
>
```

## 技术细节

### 为什么移除 key 是安全的

1. **CameraController 组件**: 已经通过 `useThree` hook 直接控制相机，不需要重新创建 Canvas
2. **状态保持**: 移除 key 后，组件实例保持不变，导管进度状态得以保持
3. **性能优化**: 避免了不必要的组件重新创建，提高了性能

### 导管进度状态管理

导管进度通过以下组件正确管理：
- `DynamicWire`: 使用 `useWorkflow(s => s.metrics.progress)` 获取进度
- `WireTip`: 使用 `useWorkflow(s => s.metrics.progress)` 获取进度
- `SceneContents`: 通过 `clipByProgress(points, progress)` 计算导管位置

## 修复效果

修复后：
1. **进度保持**: 切换到"3D Background"标签时，导管保持当前进度位置
2. **角度响应**: 角度变化仍然正常工作，通过 `CameraController` 更新相机
3. **性能提升**: 减少了不必要的组件重新创建

## 测试验证

1. **进度测试**: 在导管插入过程中切换到"3D Background"，验证导管位置保持不变
2. **角度测试**: 在"3D Background"中改变角度，验证视角正确变化
3. **切换测试**: 多次在标签间切换，验证状态保持稳定

## 相关文件

- `src/components/FluoroViewport.tsx` - 移除 Canvas key 属性
- `src/components/UnifiedScene.tsx` - 移除 Canvas key 属性
- `src/components/CameraController.tsx` - 负责相机控制

## 经验教训

1. **key 属性的使用**: 应该谨慎使用 React 的 key 属性，确保不会意外重置组件状态
2. **状态管理**: 对于需要保持状态的组件，应该避免使用会变化的 key 值
3. **性能考虑**: 重新创建组件比更新组件状态更消耗性能

---

**修复完成时间**: 2024年12月
**问题类型**: 状态重置
**解决方案**: 移除不必要的 key 属性
**影响范围**: 导管进度状态保持
