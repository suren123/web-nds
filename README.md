# Court NDS

可离线使用的 NDS 网页模拟器，针对 iPhone 横屏操作设计，带可调触控布局。

## 开发

本目录是独立项目及独立 Git 仓库。`dist/` 为直接运行的 HTML、CSS 和 JavaScript 源码，不需要框架构建。

- `npm test`：运行布局与输入检查。
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

`v0.1.0` 保存已运行的网页 v6 基线。后续功能分别提交，可用 Git 对比和回退。

主开发目录为 `/workspace/court-nds`。原 `/workspace/sites/court-touch-lab` 作为现有 Sites 仓库的发布镜像；发布时同步已提交源码，推送镜像仓库后部署。两者提交历史独立，不执行强制推送。

当前网址：https://court-touch-lab-17pro.awarejam67.chatgpt.site/

## 许可与验证范围

项目采用 GPL v2；DeSmuME-wasm 来源与源码链接见 `dist/core/NOTICE.html`。已有内核运行、输入和离线逻辑检查；iPhone 真机手感仍需设备验证。
