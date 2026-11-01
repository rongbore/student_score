# Class Bloom · 学生课堂积分管理

明亮卡通风格的班级积分管理应用，支持班级与学生管理、课堂/课后加减分、总积分、积分排名和操作记录。

## 本地运行

无需安装依赖。直接打开 `index.html`，或在仓库目录运行：

```sh
python3 -m http.server 3000
```

## GitHub Pages

在仓库 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。
推送到 `main` 后，`Deploy classroom to GitHub Pages` 工作流会自动发布；也可以从 Actions 页面手动运行。

默认地址：https://rongbore.github.io/student_score/

数据保存在当前浏览器的 localStorage 中，不会自动同步到其他设备或 GitHub。首次打开提供示例班级和学生。
