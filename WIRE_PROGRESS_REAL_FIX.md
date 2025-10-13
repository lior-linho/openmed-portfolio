# 导管进度重置问题真正原因和修复

## 问题描述

用户反馈每次点击"3D Background"标签时，导管都从头开始插入，而不是保持当前的进度状态。

## 问题分析过程

### 第一次分析（错误）

最初认为是 `Canvas` 组件的 `key` 属性导致组件重新创建，但移除 `key` 后问题仍然存在。

### 真正原因发现

通过深入分析 `UnifiedScene.tsx` 中的 `SceneContents` 组件，发现了真正的问题：

```typescript
// 自动推进 - 只处理推进逻辑，阻力采样已解耦
const progRef = useRef(0)  // 问题在这里！

useFrame((_, dt) => {
  // 推进速度受阻力影响
  const resistance = resistanceRef.current
  const base = step === 'Cross' ? 0.15 : 0.05
  const slow = Math.max(0, base * (1 - 0.7 * resistance))
  const nextP = Math.min(1, progRef.current + dt * slow * 0.1)
  const dL = arcLenBetween(points, cum, progRef.current, nextP)
  
  setProgress(nextP)  // 这里会重置进度！
  addPath(dL)
  progRef.current = nextP
})
```

## 根本原因

1. **progRef 初始化问题**: `progRef` 被硬编码初始化为 0
2. **useFrame 持续调用**: 每一帧都会调用 `setProgress(nextP)`，其中 `nextP` 是基于 `progRef.current` 计算的
3. **进度重置**: 当组件重新创建时，`progRef.current` 重置为 0，导致导管从头开始

## 修复方案

### 修改前
```typescript
const progRef = useRef(0)  // 总是从0开始
```

### 修改后
```typescript
const { metrics } = useWorkflow()
const progRef = useRef(metrics.progress) // 从当前进度开始

// 同步进度状态，确保 progRef 与当前进度保持一致
useEffect(() => {
  progRef.current = metrics.progress
}, [metrics.progress])
```

## 技术细节

### 为什么这样修复有效

1. **正确初始化**: `progRef` 现在从当前的 `metrics.progress` 开始，而不是从 0 开始
2. **状态同步**: `useEffect` 确保 `progRef.current` 始终与 `metrics.progress` 保持同步
3. **避免重置**: 即使组件重新创建，`progRef` 也会从正确的进度值开始

### 工作流程

1. 用户在主界面操作导管，进度更新到 `metrics.progress`
2. 切换到"3D Background"标签
3. `UnifiedScene` 组件重新创建
4. `progRef` 从当前的 `metrics.progress` 初始化
5. `useEffect` 确保 `progRef.current` 与 `metrics.progress` 同步
6. `useFrame` 继续从正确的进度位置推进导管

## 修复效果

修复后：
1. **进度保持**: 切换到"3D Background"时，导管保持当前进度位置
2. **连续推进**: 导管继续从当前位置推进，而不是从头开始
3. **状态一致**: 所有组件中的导管进度保持一致

## 测试验证

1. **进度测试**: 在主界面推进导管到某个位置，切换到"3D Background"，验证导管位置保持不变
2. **推进测试**: 在"3D Background"中观察导管是否继续推进
3. **切换测试**: 多次在标签间切换，验证进度保持连续

## 经验教训

1. **状态管理**: 组件内部的 ref 状态需要与全局状态保持同步
2. **初始化问题**: 硬编码的初始值可能导致状态不一致
3. **调试方法**: 需要深入分析组件的生命周期和状态更新逻辑

## 相关文件

- `src/components/UnifiedScene.tsx` - 主要修复文件
- `src/state/workflow.ts` - 进度状态管理
- `src/components/FluoroViewport.tsx` - 主显示组件

---

**修复完成时间**: 2024年12月
**问题类型**: 状态初始化错误
**解决方案**: 正确初始化 progRef 并同步状态
**影响范围**: 导管进度状态保持
