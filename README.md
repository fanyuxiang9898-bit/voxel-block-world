# 像素方块世界

基于 Three.js 的浏览器方块探索游戏，支持键鼠与移动端触控。

## 本次更新

- 桌面端 Ctrl/Cmd+Z 撤销，Ctrl/Cmd+Y 或 Ctrl/Cmd+Shift+Z 重做；移动端使用「撤」「重」按钮。
- 保存最近 100 次方块编辑的撤销历史。新编辑会清空重做分支。
- 恢复实心方块前检查玩家碰撞；区块未加载、内容发生冲突时不会消耗历史。
- 同一游戏会话中，离开后返回的区块会恢复已编辑的方块。刷新或关闭页面仍会重置世界；此版本没有磁盘存档。
- 失去窗口焦点或退出指针锁定时清空按键，避免持续移动。
- 静态资源使用相对路径，支持仓库子路径部署。

## 运行与验证

用任意本地静态 HTTP 服务打开项目目录的 index.html；Three.js 仍从原有 CDN 加载，需要联网。

Node 24+ 回归检查（无 npm 依赖）：

```sh
node --test tests/edit-history.test.mjs tests/world-edits.test.cjs
node tests/text-wall.cjs
node --check js/game.js
node --check js/voxel.js
```

单元测试覆盖撤销/重做、历史容量、冲突、未加载区块、玩家碰撞及区块重新加载。世界逻辑测试替代了 WebGL 绘制，不代表移动端触摸实机验证。

浏览器回归：
node tests/browser.cjs <playwright模块路径> <Chromium或Edge程序路径>
覆盖真实键鼠及移动触控模拟的放置、拆除、撤销、重做和暂停。

GitHub Actions 在 PR 执行逻辑回归，main 通过后仅发布 index.html、js/、styles/ 到 GitHub Pages。
