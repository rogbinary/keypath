# 免费云端数据库接入步骤：Supabase

本项目已经预留 Supabase 接口。配置完成后：

- 玩家账号会保存在 Supabase Auth
- 打字成绩会保存在 Supabase Database
- 排行榜会变成所有上线玩家共享的全站排行榜

## 第 1 步：创建 Supabase 项目

1. 打开 https://supabase.com
2. 注册或登录
3. New project
4. 填项目名称，例如 `keypath`
5. 创建完成后等待项目初始化

## 第 2 步：创建数据库表

1. 打开 Supabase 项目后台
2. 进入 SQL Editor
3. 打开本项目里的 `supabase-schema.sql`
4. 复制全部内容
5. 粘贴到 SQL Editor
6. 点击 Run

本项目 SQL 文件：

`outputs/typeflow/supabase-schema.sql`

## 第 3 步：复制 API 配置

1. 进入 Supabase Project Settings
2. 打开 API
3. 复制：
   - Project URL
   - anon / public key

然后打开：

`outputs/typeflow/supabase-config.js`

改成类似这样：

```js
window.KEYPATH_SUPABASE = {
  ENABLE_CLOUD_SYNC: true,
  URL: "https://你的项目.supabase.co",
  ANON_KEY: "你的-anon-public-key"
};
```

注意：anon/public key 可以放在前端。不要把 service_role key 放到前端。

## 第 4 步：账号注册设置

如果你希望玩家用邮箱注册：

- 保持 Supabase 默认邮箱注册设置即可。
- 玩家注册后可能需要先确认邮箱。

如果你希望玩家只输入玩家名，不输入邮箱：

1. Supabase 后台进入 Authentication
2. 进入 Providers
3. 打开 Email
4. 关闭 Confirm email

这样玩家名会自动转成内部邮箱格式，例如：

`xiaoming@keypath.local`

## 第 5 步：重新上线

把整个 `outputs/typeflow` 文件夹重新上传到 Netlify Drop，或推送到 GitHub Pages。

上线后测试：

1. 创建玩家账号
2. 完成一次打字练习
3. 玩一局游戏
4. 刷新页面
5. 用另一个浏览器或设备登录同一个账号
6. 检查成绩和排行榜是否同步

## 当前云端表

- `profiles`：玩家资料
- `scores`：玩家最高速度、准确率、游戏最高分、练习次数

## 如果排行榜没有数据

检查这几项：

1. `supabase-config.js` 里的 `ENABLE_CLOUD_SYNC` 是否为 `true`
2. URL 和 anon key 是否复制正确
3. SQL 是否完整运行
4. Supabase 的 RLS policy 是否创建成功
5. 玩家是否至少完成过一次练习或游戏

