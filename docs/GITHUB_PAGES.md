# GitHub Actions 发布试玩网站

## 开发版与公开版（0.9 起）

`CMZ-Lover/after-closing` 是开发仓库，本轮仅更新原 Sites 服务器。该仓库工作流名为 **Verify development game**，运行测试和构建；Pages 相关步骤受精确仓库名限制而跳过。没有向公开仓库推送或自动同步的步骤。

`CMZ-Lover/after-closing-public` 已按用户要求同步至 0.9.1。以下 Pages 流程用于公开仓库，后续仍需用户明确要求才同步开发内容。

工作流：仓库 Actions → **Build and deploy game**。

每次更新 main，自动安装依赖、运行全部测试、构建游戏，然后发布 GitHub Pages。也可在工作流页面选择 **Run workflow → main → Run workflow**。拉取请求只测试和构建，不部署。

## 首次设置

1. 打开仓库 **Settings → Pages**。
2. 在 **Build and deployment → Source** 选择 **GitHub Actions**。
3. 打开 **Actions → Build and deploy game**，手动运行 main。
4. 等 build、deploy 均变绿，从部署记录或运行摘要点击 **打开惊悚游乐场**，复制实际发布链接给朋友。

若 Pages 页面提示升级或公开仓库，这是账号套餐限制：GitHub Free 的 Pages 使用公开仓库；私有仓库需要支持 Pages 的付费套餐。不要仅为了排除报错就公开整个源码仓库；先决定是否愿意公开代码。参考：[GitHub Pages 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)。

## 注意事项

- 工作流使用 GitHub 自带令牌与 Pages 的 OIDC，不需要填入个人访问令牌。
- 仅上传 dist 构建产物，不上传源码、笔记、测试文件或 Sites 设置。
- Vite 的相对资源路径兼容 GitHub Pages 的仓库子目录。
- 构建成功不代表部署成功；必须看到 deploy 成功和实际网站链接。
- 网站为静态游戏；朋友的进度保存在各自浏览器里。换到 GitHub Pages 地址后，不会自动读取原试玩域名的存档。
- 公开仓库仅上传 Pages 部署所需产物，不重复保留 after-closing-web 下载包，以减少 Actions 存储占用。
- 如果只有 Pages 部署失败，先完成首次设置，再重试失败的 deploy 作业。
