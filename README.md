# 端侧 SLM 离线全栈编程导师 AI 助手 (On-Device Coding Mentor)

一款完全运行在手机移动端的离线编程导师应用。基于 **React Native + llama.rn (llama.cpp) + Qwen2.5-Coder GGUF** 构建，具备代码诊断、语法讲解、架构分析能力，真正做到**零网络依赖、毫秒级响应、完全数据隐私保护**。

---

## 目录结构说明

```
D:\J\study\on-device-mentor
├── android/                         # Android 原生平台工程与清单权限
│   └── app/src/main/AndroidManifest.xml  # 包含大模型读写与存储权限
├── src/
│   ├── components/                  # UI 表现层组件
│   │   ├── ChatMessageItem.tsx      # 对话气泡 (支持 Markdown 与实时 T/s 性能指示器)
│   │   ├── CodeBlock.tsx            # 代码高亮块与“一键复制”组件
│   │   └── QuickPrompts.tsx         # 快捷导师提示词胶囊栏 (报错排查/性能重构等)
│   ├── constants/
│   │   ├── defaultModels.ts         # 预置 3B (主力) 与 1.5B (极速) 模型配置
│   │   └── prompts.ts               # 全栈编程导师 System Prompt & Qwen ChatML 转换器
│   ├── hooks/
│   │   └── useLlamaChat.ts          # 对话状态管理 Hook (流式打字机、防抖、TTFT 统计)
│   ├── screens/
│   │   ├── ChatScreen.tsx           # 主对话界面 (键盘自适应、多行代码输入、模型状态监控)
│   │   └── ModelSettingsScreen.tsx  # 模型管理面板 (3B/1.5B 一键挂载、文件选入、线程调优)
│   ├── services/
│   │   └── llama/
│   │       └── LlamaService.ts      # llama.rn 原生推理引擎单例 (内存锁定、GPU卸载、流式输出)
│   └── types/
│       └── index.ts                 # 核心 TypeScript 类型定义
├── App.tsx                          # 应用根组件与原生 NativeStack 路由配置
├── index.js                         # React Native 注册入口
├── package.json                     # 项目依赖定义
└── metro.config.js                  # Metro 打包配置 (包含 .gguf 白名单)
```

---

## 核心设计与工程决策

1. **单例模式防 OOM (LlamaService)**
   - 移动端统一内存极其珍贵。`LlamaService` 采用单例设计，确保在加载新模型前必须先完整释放旧模型的 C++ 原生张量句柄（`release()`）。
   - 开启 `use_mlock: true`，防止 Android 系统在后台将模型物理内存交换到 Swap 空间导致掉帧。

2. **严格的端侧上下文窗口控制**
   - 限制 KV Cache 长度为 `n_ctx: 2048`。若盲目开到 8K/32K，KV Cache 会暴增 1~2GB 内存，必定引发手机 OOM 闪退。
   - `formatChatML` 自动维护滑动窗口，仅保留最近 6 轮问答，确保上下文紧凑高效。

3. **硬件参数调优基准**
   - **CPU 线程数**：默认设为 `4`。刚好占用安卓芯片的 1 个超大核 + 3 个大核，留出 4 个小核负责 Android 系统渲染与 React Native JS 线程调度，杜绝操作卡顿。
   - **GPU 卸载层数**：`n_gpu_layers: 99`。自动触发 Android Vulkan / iOS Metal 硬件加速。

4. **移动端代码阅读与复制优化**
   - 手机屏幕长按选中代码体验极差，`CodeBlock` 组件内置全局剪贴板支持，右上角提供醒目的“一键复制代码”按钮。

---

## 快速运行与调试指南

### 1. 安装依赖
在项目根目录下打开终端运行：
```bash
npm install
```

### 2. 挂载模型文件
在此前的测试中，你已经将 `qwen2.5-coder-3b-instruct-q4_k_m.gguf` 下载到了电脑并传至手机的 `Download` 目录中。
* App 在启动后进入 **设置** 页面：
  * 点击 **“🚀 挂载此模型”** 即可直接读取 `/sdcard/Download/qwen2.5-coder-3b-instruct-q4_k_m.gguf`。
  * 或者点击 **“📂 从手机文件夹选择 .gguf 格式模型”** 手动选入。

### 3. 启动应用
连接真机并开启 USB 调试后：
```bash
npm run android
```
即可在手机上直接打开并体验完全属于你自己的**离线全栈编程导师**！
