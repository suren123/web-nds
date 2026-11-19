# Web NDS 0.0.1

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

当前正式版本为 **0.0.1**，GitHub 仓库：https://github.com/suren123/web-nds 。此前的 0.1.x、0.2.x 及网页 v6–v11 为内部开发编号，历史记录保留。

`v0.1.0` 保存已运行的网页 v6 基线。`v0.2.0` 对应网页 v7，新增四个自定义圆键、分组尺寸、网格吸附与多选排列。`v0.2.1` 对应网页 v8。`v0.2.2` 对应网页 v9，项目更名为 Web NDS 并修正 Safari 旋转布局。可用 Git 对比和回退。

主开发目录为 `/workspace/web-nds`。原 `/workspace/sites/court-touch-lab` 作为现有 Sites 仓库的发布镜像；发布时同步已提交源码，推送镜像仓库后部署。两者提交历史独立，不执行强制推送。

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

## Safari 视口与本地配置

`dist/viewport.mjs` 合并旋转与浏览器工具栏引起的 resize 事件，在尺寸稳定后更新高度；全屏游玩固定在视口，旋转结束后校正页面滚动位置。输入框编辑和缩放期间不强制滚动。画布使用固定逻辑分辨率（最高 2 倍），避免旋转时反复重新分配画布与按键图层。横屏全屏不额外扣除安全区边距；竖屏灵动岛安全区域保留，62px 后备留白仅用于主屏幕独立应用模式。

布局自动保存在当前站点的 localStorage（兼容键 `court-touch-layout-v1`）；游戏和存档在 IndexedDB（兼容库名 `court-nds-v1`）。改名不迁移存储标识或网址。不同浏览器、站点或独立应用环境不保证共享数据；可导出布局 JSON 和 .dsv 存档备份。

自动化检查覆盖旋转事件合并、滚动校正、键盘及缩放处理、固定画布尺寸与配置保存；不能代替 iPhone Safari 真机验证。
