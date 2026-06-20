# Fk云班课

云班课（Mosoteach）浏览器辅助脚本，提供视频倍速控制与自动答题功能。

## 功能

### 🎬 视频倍速
- 自定义倍速：2x / 5x / 10x / 手动输入（最高 16x）
- 检测到视频播放器自动显示控制面板
- 基于 Shadow DOM，不污染页面样式

### 📝 自动答题
- 自动识别题目类型（单选题 / 多选题）
- 支持第三方题库 API 接入
- 题目序号网格，状态颜色标识（当前 / 已完成 / 有问题 / 未答）
- 手动答题自动检测，同步更新面板状态
- 切换页面自动清除题目

### ⚙️ 设置
- 答题速度可调（默认 2000ms/题）
- 题库配置弹窗，JSON 格式校验
- 设置自动保存到 localStorage

## 安装

### 前置要求
- 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/) 或 [ScriptCat](https://scriptcat.org/)

### 安装脚本
1. 打开 [YbkAuto.user.js](./YbkAuto.user.js)
2. 点击 Raw 或直接复制全部内容
3. Tampermonkey 会自动弹出安装提示，点击安装即可

或者直接通过 Greasy Fork 安装（待上传）。

## 使用方法

### 视频倍速
1. 打开云班课任意含有视频的页面
2. 面板默认显示「视频」Tab
3. 点击预设倍速按钮或输入自定义值

### 自动答题
1. 打开「设置」Tab，配置题库 API（JSON 格式）**（题库使用Zerror题库）**
2. 进入答题页面，面板自动识别题目
3. 切换到「答题」Tab，点击「开始答题」
4. 答题进度实时显示在面板上

### 题库配置格式
```json
[
  {
    "name": "题库名称",
    "homepage": "http://example.com",
    "url": "http://localhost:3000/query",
    "method": "post",
    "type": "GM_xmlhttpRequest",
    "contentType": "json",
    "data": {
      "title": "${title}",
      "options": "${options}",
      "type": "${type}"
    },
    "handler": "return (res) => res.code === 0 ? [res.message, undefined] : [res.data.question, res.data.answer, {ai: res.data.is_ai}]"
  }
]
```

**模板变量说明**
- `\${title}` — 题目文本
- `\${options}` — 选项列表（逗号分隔）
- `\${type}` — 题型标签（如"单选题"、"多选题"，
    从页面直接读取）

**handler 要求**
- 返回值须为数组 `[questionText, answerText, meta]`
- `answerText` 为答案文本，用于匹配页面选项

## 技术细节

- **Shadow DOM** — 面板样式与页面完全隔离
- **MutationObserver** — 高效检测 DOM 变化（视频出现 / 题目渲染）
- **MouseEvent 序列** — 模拟真实用户点击，兼容 Vuetify 组件
- **.sheet-item.primary 检测** — 通过页面状态判断答题完成情况

## 协议

[MIT](./LICENSE)
