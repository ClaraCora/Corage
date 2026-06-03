# Corage Fork 变更维护说明

> 最后更新：2026-06-03  
> 适用仓库：`ClaraCora/Corage` 个人 fork  
> 当前定制基线：`v2.5.2-rc.2`

本文用于记录本 fork 相比上游项目的主要改动，以及后续同步上游更新时如何保留这些改动。

## 1. 本 fork 的目标

本 fork 是个人自用版本，主要目标是：

1. 在首页增加实时连接 TOP 统计，便于快速查看连接流量分布。
2. 首页卡片支持自由排序，便于把常用信息放到更显眼的位置。
3. 发布流程只面向个人 Windows x64 安装包，减少不需要的平台和产物。
4. README 去除上游品牌、代理软件描述、推广、捐助等公开项目内容，改为中性个人桌面应用实验仓库说明。

## 2. 功能变更总览

### 2.1 首页连接 TOP 统计

新增首页卡片，用于显示两类 TOP 列表：

- 按出站节点 TOP
- 按目标地址 TOP

显示内容包括：

- 排名
- 名称
- 总流量
- 下载流量
- 上传流量
- 连接次数
- 流量占比进度条

关键设计：

- TOP 卡片横向双栏显示。
- 卡片外层大标题已隐藏，节省首页空间。
- 列表内部间距压缩，避免底部超出卡片边框。
- 出站节点使用具体节点名，不使用分组名。
- 统计数据只保存在内存，不持久化、不外传。

### 2.2 软件级实时统计采集

原本如果只在某个页面打开时统计，可能只统计页面打开期间的数据。本 fork 将连接数据订阅放到全局布局中，使应用启动后就持续采集连接快照。

关键点：

- `src/pages/_layout.tsx` 中调用 `useConnectionData()`。
- `useConnectionData()` 通过 `MihomoWebSocket.connect_connections()` 订阅连接数据。
- 每次收到连接快照后调用 `ingestConnectionTopStatsSnapshot(...)` 更新 TOP 统计。

### 2.3 首页卡片自由排序

首页设置弹窗增加拖拽排序能力。

关键点：

- 使用 `@dnd-kit/core`、`@dnd-kit/sortable`、`@dnd-kit/utilities`。
- `home_cards` 除了保存每张卡片是否显示，也保存 `order` 数组。
- 新增 `normalizeHomeCardOrder(...)`，确保上游新增卡片时不会丢失，未知卡片会被过滤，缺失卡片会补回默认顺序末尾。

### 2.4 TOP 卡片 UI 美化和紧凑化

连接 TOP 卡片尽量接近之前 zashboard 预览风格：

- 双栏卡片。
- 排名 Chip。
- 流量进度条。
- 下载、上传、连接数摘要。
- 轻微背景渐变和边框。
- 紧凑间距，适配首页单页展示。

### 2.5 发布流程调整

GitHub Actions 已改为只构建并发布 Windows x64 NSIS setup 安装包。

目标产物模式：

```text
target/x86_64-pc-windows-msvc/release/bundle/nsis/*_x64-setup.exe
```

同时禁用了不需要的 Linux、ARM、fixed WebView2、updater、winget、telegram 等流程。

### 2.6 Updater artifact 关闭

由于个人 fork 只需要 setup 安装包，不需要生成 updater artifact。Tauri build 在生成 setup 后如果继续创建 updater artifact，需要 updater 私钥和密码，CI 曾因此失败。

已在 `src-tauri/tauri.conf.json` 中设置：

```json
"createUpdaterArtifacts": false
```

同步上游时必须保留该设置，除非后续重新配置完整 updater 签名密钥。

### 2.7 README 中性化

`README.md` 已改为中性说明：

- 不再提上游原项目品牌名。
- 不再描述代理软件用途。
- 不再包含上游下载地址、TG、推广、捐助、机场推荐等内容。
- 改为个人桌面应用实验仓库说明。

## 3. 关键文件清单

后续同步上游时，优先检查以下文件是否被覆盖或产生冲突。

### 3.1 连接 TOP 统计核心

| 文件 | 作用 | 维护重点 |
| --- | --- | --- |
| `src/services/connection-top-stats.ts` | 内存 TOP 统计服务 | 保留 `TOP_LIMIT`、`MAX_STATS_KEYS`、`seenConnections`、`ingestConnectionTopStatsSnapshot`、`useConnectionTopStats` |
| `src/hooks/use-connection-data.ts` | 连接数据订阅与快照合并 | 保留导入 `ingestConnectionTopStatsSnapshot`，并在合并快照后调用 |
| `src/pages/_layout.tsx` | 全局布局 | 保留 `useConnectionData()` 的全局调用，确保打开应用后持续采集 |
| `src/components/home/connection-top-stats-card.tsx` | 首页 TOP 卡片 UI | 保留双栏、紧凑样式、流量/连接数展示 |

### 3.2 首页卡片排序

| 文件 | 作用 | 维护重点 |
| --- | --- | --- |
| `src/pages/home.tsx` | 首页卡片配置、设置弹窗、拖拽排序 | 保留 `HOME_CARD_KEYS` 中的 `connectionTopStats`、`order`、`normalizeHomeCardOrder`、dnd-kit 设置 |
| `src/types/global.d.ts` | 全局配置类型 | 保留 `home_cards?: Record<string, boolean \| string[] \| undefined>` 这类允许保存 `order` 的类型 |
| `src/components/home/enhanced-card.tsx` | 首页卡片容器 | 保留 `hideHeader?: boolean`，TOP 卡片依赖它隐藏外层标题 |

### 3.3 i18n 文案

| 文件 | 作用 | 维护重点 |
| --- | --- | --- |
| `src/locales/zh/home.json` | 中文首页文案 | 保留连接 TOP 文案、卡片排序拖拽文案 |
| `src/locales/en/home.json` | 英文首页文案 | 保留连接 TOP 文案、卡片排序拖拽文案 |

同步上游后如 i18n 类型报错，执行：

```powershell
pnpm run i18n:types
```

### 3.4 发布与构建

| 文件 | 作用 | 维护重点 |
| --- | --- | --- |
| `.github/workflows/release.yml` | tag 触发 Release Build | 保留只构建 Windows x64 setup、`Get Version` 的 PowerShell 写法、上传 `*_x64-setup.exe` |
| `.github/workflows/autobuild.yml` | 自动构建流程 | 保留只构建 Windows x64 setup、禁用多余平台 |
| `src-tauri/tauri.conf.json` | Tauri 打包配置 | 保留 `createUpdaterArtifacts: false` |
| `package.json` | 前端版本与脚本 | 发版时版本要和 tag 一致 |
| `src-tauri/Cargo.toml` | Tauri/Rust 版本 | 发版时版本要和 `package.json` 一致 |
| `Cargo.lock` | Rust 锁文件 | 版本更新后需要随提交更新 |

### 3.5 仓库说明

| 文件 | 作用 | 维护重点 |
| --- | --- | --- |
| `README.md` | 仓库首页说明 | 保持中性个人项目说明，不恢复上游品牌、代理用途、推广和捐助内容 |
| `docs/FORK_MAINTENANCE.md` | 本文件 | 每次新增 fork 定制后更新 |

## 4. 上游同步建议流程

以下流程用于从上游同步新版本，同时保留本 fork 的定制。

### 4.1 同步前准备

1. 确认当前工作区干净：

```powershell
git status --short
```

2. 如果有未提交改动，先提交或暂存。
3. 建议创建同步分支：

```powershell
git switch main
git pull origin main
git switch -c sync-upstream-YYYYMMDD
```

4. 确认上游远端名称。示例：

```powershell
git remote -v
```

如果尚未添加上游远端，可添加官方仓库远端，例如：

```powershell
git remote add upstream <上游仓库地址>
```

> 注意：不要向上游仓库 push，不要创建 PR，除非明确需要。

### 4.2 拉取上游更新

```powershell
git fetch upstream
```

同步方式可二选一：

#### 方式 A：merge，上手简单

```powershell
git merge upstream/main
```

#### 方式 B：rebase，历史更线性

```powershell
git rebase upstream/main
```

如果冲突较多，推荐 merge，方便保留本 fork 的独立定制提交。

### 4.3 冲突处理优先级

遇到冲突时按以下优先级处理：

1. 安全修复、依赖升级、Tauri/Rust/React 兼容性修复：优先接受上游。
2. 首页连接 TOP、全局连接采集、首页排序：必须保留本 fork 改动。
3. 发布 workflow：必须保留只构建 Windows x64 setup 的策略。
4. README：必须保留中性说明，不恢复上游品牌和代理软件说明。
5. i18n：合并上游新增 key，同时保留本 fork 新增 key。

## 5. 逐文件保留策略

### 5.1 `src/services/connection-top-stats.ts`

这是本 fork 新增的统计服务。上游同步时如果文件不存在或被删除，需要恢复。

必须保留：

- `TOP_LIMIT = 5`
- `MAX_STATS_KEYS = 500`
- `EMPTY_KEY = '-'`
- `getOutboundKey(connection) => connection.chains?.[0]`
- `getDestinationKey(...)`
- `seenConnections` 防止重复累计同一连接。
- counter reset 处理逻辑。
- `trimStatsMap(...)` 控制内存上限。
- `useConnectionTopStats()` 基于 `useSyncExternalStore`。

可按需要调整：

- `TOP_LIMIT` 可改成 10 等更大值，但首页高度可能不够。
- `MAX_STATS_KEYS` 可根据长期运行内存占用调整。

不要改回：

- 不要把出站节点改成分组名。
- 不要改成只统计当前页面打开期间。

### 5.2 `src/hooks/use-connection-data.ts`

必须保留：

```ts
import { ingestConnectionTopStatsSnapshot } from '@/services/connection-top-stats'
```

以及在收到连接数据并完成 `mergeConnectionSnapshot(...)` 后：

```ts
ingestConnectionTopStatsSnapshot(merged.activeConnections)
```

如果上游重构了连接订阅逻辑，需要把这一步迁移到新的连接快照入口。

原则：只要应用收到 `/connections` 的 active connections 快照，就要调用统计服务 ingest。

### 5.3 `src/pages/_layout.tsx`

必须保留：

```ts
import { useConnectionData } from '@/hooks/use-connection-data'
```

以及 `Layout` 组件内部的：

```ts
useConnectionData()
```

这样统计才是应用级实时统计，而不是进入某个页面后才开始统计。

如果上游改变 Layout 结构，需要找到全局长期挂载的位置重新放置。

### 5.4 `src/components/home/connection-top-stats-card.tsx`

这是首页 TOP 卡片 UI。同步上游时如果 MUI API 或 Grid API 变化，需要按新 API 修正，但保留以下结构：

- 外层 `Grid container`。
- 左侧 `TOP by Outbound Node`。
- 右侧 `TOP by Destination`。
- 每项显示排名、名称、总流量、下载、上传、连接数、进度条。
- 样式保持紧凑，不让列表超出卡片边框。

### 5.5 `src/pages/home.tsx`

必须保留：

- dnd-kit 相关 import。
- `HOME_CARD_KEYS` 中的 `connectionTopStats`。
- `HomeCardsSettings` 中的 `order?: HomeCardKey[]`。
- `normalizeHomeCardOrder(...)`。
- `SortableHomeCardItem`。
- `HomeSettingsDialog` 中的拖拽排序逻辑。
- `defaultCards.connectionTopStats = true`。
- `defaultCards.order = [...HOME_CARD_KEYS]`。
- `cardRenderers.connectionTopStats`。
- `orderedCards` 按 `effectiveCardOrder` 渲染。

如果上游新增首页卡片：

1. 把新卡片 key 加入 `HOME_CARD_KEYS`。
2. 在 `getHomeCardLabel(...)` 增加显示名称。
3. 在 `defaultCards` 增加默认开关。
4. 在 `cardRenderers` 增加渲染器。
5. 确认 `normalizeHomeCardOrder(...)` 会把新卡片补到顺序末尾。

### 5.6 `src/components/home/enhanced-card.tsx`

必须保留 `hideHeader?: boolean`。连接 TOP 卡片使用：

```tsx
<EnhancedCard noContentPadding hideHeader>
```

如果该能力丢失，TOP 卡片外层大标题会恢复，占用首页空间。

### 5.7 `src/types/global.d.ts`

必须允许 `home_cards` 保存 `order` 数组。

当前思路是让 `home_cards` 支持 boolean 和 string array：

```ts
home_cards?: Record<string, boolean | string[] | undefined>
```

如果上游引入了更严格的配置类型，需要显式定义类似：

```ts
home_cards?: Record<string, boolean | string[] | undefined>
```

或：

```ts
type HomeCardsConfig = Record<string, boolean | string[] | undefined> & {
  order?: string[]
}
```

### 5.8 `.github/workflows/release.yml`

必须保留：

- matrix 只包含 `windows-latest` + `x86_64-pc-windows-msvc`。
- build 命令：`pnpm build --target ${{ matrix.target }}`。
- release 上传：`target/${{ matrix.target }}/release/bundle/nsis/*_x64-setup.exe`。
- `Get Version` 使用 PowerShell 兼容写法：

```powershell
$version = node -p "require('./package.json').version"
"VERSION=$version" >> $env:GITHUB_ENV
```

不要恢复 Bash 风格写法：

```powershell
echo "VERSION=$(node -p \"require('./package.json').version\")" >> $env:GITHUB_ENV
```

该写法在 Windows runner PowerShell 中会导致 Node 解析错误。

### 5.9 `.github/workflows/autobuild.yml`

必须保留和 release workflow 一致的 Windows x64 setup-only 策略。

如果上游增加新的发布 job，默认禁用或删除，除非确实需要。

### 5.10 `src-tauri/tauri.conf.json`

必须保留：

```json
"createUpdaterArtifacts": false
```

否则 CI 可能在 setup 已生成后尝试 updater artifact 签名，并因缺少 updater 私钥失败。

## 6. 同步上游后的验证清单

每次同步上游后，按顺序执行以下检查。

### 6.1 静态检查

```powershell
pnpm typecheck
pnpm lint
pnpm web:build
```

如果 i18n 类型报错，先执行：

```powershell
pnpm run i18n:types
```

再重新跑检查。

### 6.2 本地 Windows x64 构建

```powershell
pnpm build --target x86_64-pc-windows-msvc
```

如果 PowerShell 找不到 Cargo/Rust：

```powershell
$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
```

预期安装包位置：

```text
target/x86_64-pc-windows-msvc/release/bundle/nsis/*_x64-setup.exe
```

### 6.3 功能验证

启动应用后检查：

1. 首页存在连接 TOP 卡片。
2. TOP 卡片横向双栏显示。
3. 卡片外层没有额外大标题。
4. 出站节点 TOP 显示具体节点名。
5. 目标地址 TOP 显示 host / remoteDestination / destinationIP。
6. 总流量、下载、上传、连接次数会随连接变化更新。
7. 不进入连接页面，仅停留首页或其他页面，TOP 统计也会更新。
8. 首页设置弹窗可以拖拽排序卡片。
9. 保存排序后重启应用，排序仍然生效。
10. TOP 列表底部不超出卡片边框。

### 6.4 GitHub Actions 验证

推送 tag 前检查：

1. `package.json` 版本号。
2. `src-tauri/Cargo.toml` 版本号。
3. `Cargo.lock` 中对应包版本。
4. tag 名称必须等于 `v版本号`，例如：`v2.5.2-rc.2`。
5. workflow 上传路径仍是 `*_x64-setup.exe`。
6. `createUpdaterArtifacts` 仍是 `false`。

## 7. 推荐提交策略

同步上游和保留 fork 定制时，建议拆分提交：

1. `chore(upstream): sync upstream changes`
2. `fix(fork): preserve home connection top stats`
3. `fix(fork): preserve windows x64 setup release workflow`
4. `docs: update fork maintenance notes`

这样后续如果再次同步上游，更容易看出哪些是上游改动，哪些是本 fork 必须长期保留的改动。

## 8. 常见冲突处理

### 8.1 上游改了首页布局

处理方式：

1. 优先接受上游新的基础布局。
2. 重新加入 `connectionTopStats` 卡片 renderer。
3. 确认 `orderedCards` 仍按保存顺序渲染。
4. 确认设置弹窗还能拖拽排序。

### 8.2 上游改了连接订阅 hook

处理方式：

1. 找到新的 `/connections` WebSocket 快照入口。
2. 在 active connections 快照稳定后调用 `ingestConnectionTopStatsSnapshot(...)`。
3. 保留全局挂载调用，避免变成页面级统计。

### 8.3 上游改了 Tauri 配置

处理方式：

1. 合并上游必要配置。
2. 保留 `createUpdaterArtifacts: false`。
3. 本地跑一次 Windows x64 build。

### 8.4 上游改了 Release workflow

处理方式：

1. 保留必要的 action 版本升级。
2. 删除或禁用不需要的平台 job。
3. 确保最终只上传 `*_x64-setup.exe`。
4. 确保 Windows shell 中的命令是 PowerShell 兼容写法。

### 8.5 README 被上游覆盖

处理方式：

1. 恢复本 fork 的中性 README。
2. 不恢复上游品牌、代理用途、推广、捐助内容。
3. 如本维护文档有新变更，顺手更新。

## 9. 当前已知注意事项

1. 连接 TOP 统计目前是内存统计，应用重启后清空。
2. `connectionCount` 当前表示当前已见 active connection id 数量，不是长期历史总连接数。
3. `seenConnections` 会移除已关闭连接 id，统计聚合值保留在 outbound/destination map 中。
4. 如果未来需要跨重启保留统计，需要另行设计本地持久化，不能直接塞进当前内存服务。
5. 如果未来 TOP 数量增大，需要同步调整首页卡片高度或列表滚动策略。
6. 如果重新启用 updater artifact，必须配置正确的 Tauri updater signing secret，否则 CI 仍可能失败。

## 10. 快速恢复清单

如果同步上游后发现本 fork 功能丢失，按下面顺序恢复：

1. 恢复 `src/services/connection-top-stats.ts`。
2. 在 `src/hooks/use-connection-data.ts` 中恢复 ingest 调用。
3. 在 `src/pages/_layout.tsx` 中恢复全局 `useConnectionData()`。
4. 恢复 `src/components/home/connection-top-stats-card.tsx`。
5. 在 `src/pages/home.tsx` 恢复 `connectionTopStats` 卡片和排序逻辑。
6. 在 `src/components/home/enhanced-card.tsx` 恢复 `hideHeader`。
7. 在 `src/types/global.d.ts` 恢复 `home_cards` 的 `order` 类型支持。
8. 恢复中英文 i18n key 并生成类型。
9. 恢复 release/autobuild 的 Windows x64 setup-only 策略。
10. 确认 `src-tauri/tauri.conf.json` 中 `createUpdaterArtifacts` 为 `false`。
11. 恢复中性 README。
12. 跑完整验证清单。
