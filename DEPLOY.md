# 键途 KeyPath 免费上线指南

这是一个纯前端静态网页，不需要服务器、不需要数据库，适合免费部署。

## 方案一：Netlify Drop，最快

适合：想最快拿到一个在线网址。

1. 打开 https://app.netlify.com/drop
2. 登录或注册 Netlify。
3. 把整个 `typeflow` 文件夹拖进去。
4. 等待上传完成，Netlify 会自动生成一个网址。

需要上传的文件夹：

`outputs/typeflow`

上线后可以在 Netlify 后台修改站点名称，免费域名通常类似：

`https://你的名字.netlify.app`

## 方案二：GitHub Pages，适合长期维护

适合：以后要继续更新版本。

1. 创建一个 GitHub 仓库，例如 `keypath-typing-app`。
2. 把 `outputs/typeflow` 里面的所有文件上传到仓库根目录。
3. 进入仓库 Settings → Pages。
4. Source 选择 `Deploy from a branch`。
5. Branch 选择 `main`，目录选择 `/root`。
6. 保存后等待 1 到 3 分钟。

上线地址通常类似：

`https://你的GitHub用户名.github.io/keypath-typing-app/`

## 推荐

如果你只是想马上上线，选 Netlify Drop。

如果你准备把这个 App 持续做下去，选 GitHub Pages。

## 账号功能说明

当前版本已经支持玩家创建账号、登录、退出，并按账号分别保存练习成绩和游戏最高分。

为了保持免费、免服务器，账号数据现在保存在玩家当前浏览器里：

- 同一台设备、同一个浏览器可以正常登录使用。
- 换手机、换电脑或清除浏览器数据后，账号不会自动同步。
- 如果要做真正的在线账号、跨设备同步和全站排行榜，下一步建议接入 Supabase 或 Firebase 的免费方案。

## 排行榜说明

当前版本已经加入排行榜：

- 速度榜：按玩家最高 WPM 排名。
- 游戏榜：按玩家最高游戏分数排名。
- 当前玩家会在排行榜中高亮显示。

免费静态版排行榜会统计当前浏览器里创建过的玩家账号。  
如果要让所有上线用户都看到同一个全站排行榜，需要接入云端数据库。

## 云端数据库

已加入 Supabase 免费数据库接入文件：

- `supabase-config.js`：填写 Supabase URL 和 anon/public key
- `supabase-schema.sql`：创建玩家资料表、成绩表和安全规则
- `CLOUD_SETUP.md`：完整中文配置步骤

## 本地文件说明

- `index.html`：页面结构
- `app.css`：界面样式
- `app.js`：练习、等级、游戏逻辑
- `.nojekyll`：让 GitHub Pages 正常发布静态文件
