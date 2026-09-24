# GitHub Actions 发布试玩网站

工作流：仓库 Actions → **Build and deploy game**。

每次更新 main，自动安装依赖、运行全部测试、构建游戏，然后发布 GitHub Pages。也可在工作流页面选择 **Run workflow → main → Run workflow**。拉取请求只测试和构建，不部署。

## 首次设置

1. 打开仓库 **Settings → Pages**。
2. 在 **Build and deployment → Source** 选择 **GitHub Actions**。
3. 打开 **Actions → Build and deploy game**，手动运行 main。
4. 等 build、deploy 均变绿，从部署记录或运行摘要点击 **打开惊悚游乐场**，复制实际发布链接给朋友。

本仓库为公开仓库，源码、文档和美术资源均对所有人可见。参考：[GitHub Pages 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)。

## 注意事项

- 工作流使用 GitHub 自带令牌与 Pages 的 OIDC，不需要填入个人访问令牌。
- Pages 仅部署 dist 构建产物；公开仓库本身包含源码、文档、测试和美术资源，不含 Sites 设置。
- Vite 的相对资源路径兼容 GitHub Pages 的仓库子目录。
- 构建成功不代表部署成功；必须看到 deploy 成功和实际网站链接。
- 网站为静态游戏；朋友的进度保存在各自浏览器里。换到 GitHub Pages 地址后，不会自动读取原试玩域名的存档。
- 每次构建还保留14天的 after-closing-web 下载包。它是静态网站文件，需通过 HTTP 服务打开，不能保证直接双击 index.html 运行。
- 如果只有 Pages 部署失败，先完成首次设置，再重试失败的 deploy 作业。
