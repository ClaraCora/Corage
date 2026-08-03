# Corage

Corage 是一个个人维护的桌面应用实验仓库，主要用于验证跨平台桌面应用的界面、构建流程和本地数据展示能力。

本仓库面向个人使用和持续迭代，不作为任何上游项目的官方说明页，也不提供面向公众的产品承诺。

## 项目定位

- 桌面应用 UI 与交互实验
- 本地状态、运行信息和统计信息展示
- Windows 本地构建与自动化发布流程验证
- Tauri、React、TypeScript 与 Rust 集成实践

## 技术栈

- [Tauri](https://tauri.app/) 2
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Rust](https://www.rust-lang.org/)
- [Vite](https://vite.dev/)

## 开发

安装依赖：

```shell
pnpm i
```

准备运行所需资源：

```shell
pnpm run prebuild
```

启动开发环境：

```shell
pnpm dev
```

## 构建

构建前端：

```shell
pnpm web:build
```

构建桌面应用：

```shell
pnpm build
```

构建 Windows x64 安装包：

```shell
pnpm build --target x86_64-pc-windows-msvc
```

## 质量检查

```shell
pnpm typecheck
pnpm lint
pnpm web:build
```

## 发布说明

当前自动化流程主要面向个人 Windows x64 安装包构建。发布标签需与 `package.json` 中的版本保持一致，例如：

```text
v2.5.2-rc.2
```

## 许可证

本仓库遵循 GPL-3.0 License。详见 [LICENSE](./LICENSE)。
