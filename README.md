# 随心掌机

可离线使用的 NDS 网页模拟器，针对 iPhone 横屏操作设计，带可调触控布局。

## 开发

本目录是独立项目及独立 Git 仓库。`dist/` 为直接运行的 HTML、CSS 和 JavaScript 源码，不需要框架构建。

- `npm install`：安装测试用依赖（应用运行不依赖 npm）。
- `npm test`：运行布局、UI 输入桥接、Canvas 渲染和离线缓存检查。
- `npm run dev`：本地开发服务器，访问 http://localhost:4173。
- `npm run package`：更新开源网页源码下载包。

首次需联网缓存；离线运行依赖 HTTPS 或 localhost 下的 Service Worker。游戏和存档保存在用户浏览器，不上传。仓库不包含商业 ROM、用户存档或访问令牌。

## 目录

- `dist/layout.mjs`：布局、命中判定、输入组合与配置迁移。
- `dist/app.mjs`：触控、编辑器与 Canvas 渲染。
- `dist/emulator.mjs`、`nds-worker.js`：NDS 内核适配。
- `dist/storage.mjs`、`sw.js`：本地游戏、存档及离线缓存。
- `dist/core/`：开源内核、对应源码和许可。
- `.openai/hosting.json`：现有 Site 的发布标识，更新时保持不变。

## 版本与发布

`v0.1.0` 保存已运行的网页 v6 基线。`v0.2.0` 对应网页 v7，新增四个自定义圆键、分组尺寸、网格吸附与多选排列。`v0.2.1` 对应网页 v8，统一改名为「随心掌机」。可用 Git 对比和回退。

主开发目录为 `/workspace/suixin-handheld`。原 `/workspace/sites/court-touch-lab` 作为现有 Sites 仓库的发布镜像；发布时同步已提交源码，推送镜像仓库后部署。两者提交历史独立，不执行强制推送。

当前网址：https://court-touch-lab-17pro.awarejam67.chatgpt.site/

## 许可与验证范围

项目采用 GPL v2；DeSmuME-wasm 来源与源码链接见 `dist/core/NOTICE.html`。已有内核运行、输入和离线逻辑检查；iPhone 真机手感仍需设备验证。

## 触控编辑器

- ABXY 加四个自定义键，共八个圆键，共享直径，各自保留位置和触控外扩。
- 自定义组合支持 A/B/X/Y/L/R/START/SELECT 的同时按住；不是宏或连发。第四键初始未配置。
- MENU/SELECT/START/SWAP 共享宽高，L/R 共享另一组宽高；全部控制器共享不透明度。
- 「拖动位置」使用网格吸附和中心/边缘对齐线。「画面多选」或复选框选择要对齐的按键。
- 「对齐成一行/列」至少两个按键；等间距至少三个，空间不足时拒绝排列并提示。
- 「八键排成两行」是可撤销预设；升级不会自动应用。
- 布局 schema v3 可迁移 v1/v2，新键寻找无重叠空位；旧位置保留，尺寸变化造成的重叠会提示。

开发编辑器逻辑位于 `dist/editor.mjs`。更新脚本、样式和缓存时，同步 HTML 查询版本与 `sw.js` 文件清单；`update.html` 应与 `index.html` 完全一致。不要删除浏览器的存档数据库来刷新页面。
