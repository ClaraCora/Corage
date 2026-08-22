# Windows 服务模式故障排查：内核起不来 / 服务装不上 / 卸载不掉

> 最后更新：2026-08-22
> 适用平台：Windows
> 适用症状：服务模式下内核无法启动、服务反复安装失败、服务无法卸载

## 0. 一句话结论

如果你遇到「服务装上了但内核起不来」「服务怎么都装不上」「服务卸载不掉」——
**大概率是 `C:\ProgramData\clash-verge-service\bin\.repair.lock` 这个陈旧锁文件。**

删掉它 + 两个陈旧运行时文件，重新安装服务即可。**这与应用版本无关，回滚版本不能解决。**

直接跳到 [第 3 节](#3-修复步骤) 动手，或先读 [第 2 节](#2-先确认是不是这个问题) 确认。

---

## 1. 症状清单

以下症状**全部由同一个根因引起**，出现任意一条就适用本文：

| 你看到的现象 | 出现位置 |
| --- | --- |
| `启动核心失败: Failed to start owner core: 等待的操作过时。 (os error 258)` | 应用日志 |
| `failed to connect to named pipe: \\.\pipe\verge-mihomo-production-<hash>, 系统找不到指定的文件。 (os error 2)` | 应用日志 |
| `Some issue with service IPC Path: 系统找不到指定的文件。 (os error 2)` | 应用日志（旧版本表现） |
| 日志说 `服务已运行且版本匹配，直接使用`，但内核依然起不来 | 应用日志（**这是误报**） |
| 点「安装服务」提示成功，但 TUN 模式仍然不可用 | 界面 |
| 点「卸载服务」失败，或反复卸载都没反应 | 界面 |
| 只能用 Sidecar 模式，切不到 Service 模式 | 界面 |
| 装回旧版本（如 2.5.2）症状完全一样 | —— |

**关键判断依据**：如果换版本（新版↔旧版）症状一模一样，那就不是代码问题，是机器状态问题，本文适用。

---

## 2. 先确认是不是这个问题

以 **管理员身份** 打开 PowerShell，执行：

```powershell
# 2.1 服务到底注册了没有
sc.exe query clash_verge_service

# 2.2 用另一种方式再确认一次（避免服务名判断失误）
Get-Service | Where-Object { $_.Name -like "*erge*" -or $_.DisplayName -like "*erge*" } |
    Format-List Name,DisplayName,Status

# 2.3 有没有服务进程在跑
Get-Process -Name "clash-verge-service" -ErrorAction SilentlyContinue |
    Select-Object Id,Path,StartTime

# 2.4 看服务数据目录的文件时间戳（核心线索）
Get-ChildItem "C:\ProgramData\clash-verge-service\" -Recurse -Force |
    Select-Object LastWriteTime,Length,FullName
```

### 如何解读

**符合本文情况的典型输出：**

```
# 2.1 →
[SC] EnumQueryServicesStatus:OpenService 失败 1060:
指定的服务未安装。

# 2.2 → 空（什么都没列出来）

# 2.3 → 空（没有进程）

# 2.4 → 但是目录里有今天刚写的文件，并且有：
2026/8/22 0:47:54    0 字节    C:\ProgramData\clash-verge-service\bin\.repair.lock
2026/8/22 13:03:27   5 字节    C:\ProgramData\clash-verge-service\runtime\clash-verge-service.pid
2026/8/22 13:03:27   24 字节   C:\ProgramData\clash-verge-service\runtime\clash-verge-service.owner.lock
```

**决定性矛盾**：服务「未安装」（1060）、没有进程在跑，但数据目录里却有**刚刚写入**的文件。

这说明每次点「安装服务」，安装器都在往 `C:\ProgramData\clash-verge-service\` 铺文件，
然后撞上 `.repair.lock` 放弃注册、静默退出（**退出码还是 0**，所以界面显示"成功"）。

**重点看 `.repair.lock`**：如果它是 **0 字节**、创建时间是**几小时甚至几天前**，那就 100% 确认了——
这把锁的主人早已死亡，但锁文件还在，后续每次安装都被它挡住。

> `users\` 子目录下若有一串大小相同（如 498 字节）、时间间隔 2–3 秒的文件，
> 那是失败的启动请求记录——证明 IPC 是通的、请求进到服务了，但服务内部无法完成。

---

## 3. 修复步骤

全部在 **管理员 PowerShell** 中执行。

### 3.1 备份（安全网）

```powershell
Copy-Item "C:\ProgramData\clash-verge-service" `
          "C:\ProgramData\clash-verge-service.bak-$(Get-Date -Format 'yyyyMMdd')" `
          -Recurse -Force
```

### 3.2 退出应用

**托盘图标右键 → 退出**，不要只关窗口。然后确认进程清干净：

```powershell
Get-Process -Name "clash-verge","verge-mihomo*" -ErrorAction SilentlyContinue
# 如有残留：
Stop-Process -Name "verge-mihomo" -Force -ErrorAction SilentlyContinue
```

### 3.3 删除陈旧锁和陈旧运行时状态 ★ 关键一步

```powershell
Remove-Item "C:\ProgramData\clash-verge-service\bin\.repair.lock" -Force -ErrorAction SilentlyContinue
Remove-Item "C:\ProgramData\clash-verge-service\runtime\clash-verge-service.pid" -Force -ErrorAction SilentlyContinue
Remove-Item "C:\ProgramData\clash-verge-service\runtime\clash-verge-service.owner.lock" -Force -ErrorAction SilentlyContinue
```

三个文件的作用：

| 文件 | 作用 | 为什么要删 |
| --- | --- | --- |
| `bin\.repair.lock` | 自我修复互斥锁 | **根因**。持有者已死，锁未释放，挡住所有后续安装 |
| `runtime\*.pid` | 服务进程 PID | 指向已死进程，导致应用误判「服务已运行」 |
| `runtime\*.owner.lock` | 所有者会话锁 | 同上，陈旧会话状态 |

### 3.4 手工运行安装器（不要用界面按钮）

```powershell
& "C:\Program Files\Clash Verge\resources\clash-verge-service-install.exe"
echo "退出码: $LASTEXITCODE"
```

> **为什么必须手工跑**：应用内部是以隐藏窗口方式调用安装器的
> （`src-tauri/src/core/service.rs` 中 `RunasCommand::new(&install_path).show(false)`），
> 所有报错都被吞掉了。手工运行才能看到真实错误。

### 3.5 验证服务真的注册上了

```powershell
Get-Service | Where-Object { $_.Name -like "*erge*" } | Format-List Name,DisplayName,Status
```

**期望输出：**

```
Name        : clash_verge_service
DisplayName : Clash Verge Service
Status      : Running
```

看到 `Status : Running` 才算成功。如果这里仍然是空的，看 [第 5 节](#5-如果还是不行)。

### 3.6 以普通用户身份启动应用 ★ 容易踩坑

**不要**右键「以管理员身份运行」，直接双击正常启动。

> **为什么**：应用被提权运行时，会主动跳过服务、直接降级到 Sidecar 模式。
> 相关逻辑在 `src-tauri/src/core/manager/lifecycle.rs` 的 `wait_for_service_if_needed()`，
> 日志会打印 `service unavailable while app is elevated; starting sidecar immediately`。

启动后到设置里确认运行模式显示 **Service**，然后测试 TUN 模式开关。

---

## 4. 收尾

### 4.1 可能遇到「Configuration validation is already running」

修好服务后第一次启动可能弹这个提示。

这是**内存里的标志位**（`src-tauri/src/core/validate.rs` 的 `is_processing: AtomicBool`），
不是磁盘锁——**彻底退出应用再启动即可清除**。这是上一次卡住的验证留下的残留，不是新故障。

如果重启后依然报这个，检查有没有挂住的验证进程：

```powershell
Get-Process -Name "verge-mihomo*" -ErrorAction SilentlyContinue |
    Select-Object Id,ProcessName,StartTime,Path
Stop-Process -Name "verge-mihomo" -Force -ErrorAction SilentlyContinue
```

（成因：验证时调用 `verge-mihomo.exe -t -d ... -f ...` 时没有设超时，
子进程若挂住则标志位不会释放。）

### 4.2 删除备份目录

稳定运行几天后再删：

```powershell
Remove-Item "C:\ProgramData\clash-verge-service.bak-*" -Recurse -Force
```

### 4.3 日志在哪

| 用途 | 路径 |
| --- | --- |
| 应用日志 | `%APPDATA%\io.github.clash-verge-rev.clash-verge-rev\logs\latest.log` |
| Sidecar 日志 | `...\logs\sidecar\sidecar_latest.log` |
| 服务日志（新版） | `C:\ProgramData\clash-verge-service\`（需管理员权限读取） |
| 服务日志（旧版残留） | `...\logs\service\service_latest.log` |

> 注意：新版服务**不再**往 `%APPDATA%\...\logs\service\` 写日志。
> 如果那个目录的最新文件是几个月前的，属正常现象，不代表服务坏了。

---

## 5. 如果还是不行

### 5.1 服务注册不上（3.5 仍为空）

手工运行卸载器彻底清理后重来：

```powershell
& "C:\Program Files\Clash Verge\resources\clash-verge-service-uninstall.exe"
echo "退出码: $LASTEXITCODE"

# 确认 SCM 里已无残留
sc.exe query clash_verge_service

# 如果 SCM 里还有僵尸注册项，强制删除
sc.exe delete clash_verge_service

# 然后重新安装
& "C:\Program Files\Clash Verge\resources\clash-verge-service-install.exe"
```

### 5.2 核弹级重置

```powershell
# 停应用、停服务
Stop-Process -Name "clash-verge","verge-mihomo*" -Force -ErrorAction SilentlyContinue
sc.exe stop clash_verge_service
sc.exe delete clash_verge_service

# 备份后清空整个服务数据目录
Copy-Item "C:\ProgramData\clash-verge-service" "C:\ProgramData\cvs-full-backup" -Recurse -Force
Remove-Item "C:\ProgramData\clash-verge-service" -Recurse -Force

# 重新安装服务
& "C:\Program Files\Clash Verge\resources\clash-verge-service-install.exe"
```

### 5.3 检查端口占用（次要原因）

同类软件（FlClash、Soho / MihomoGuiService 等）可能抢占端口：

```powershell
netstat -ano | Select-String "7897|9090"
Get-Service | Where-Object { $_.Name -like "*lash*" -or $_.Name -like "*ihomo*" } |
    Format-List Name,DisplayName,Status
```

> 实测提示：本次排查中曾误判为端口冲突。若 `netstat` 输出为空，
> 说明端口没被占用，**不要在这个方向上继续浪费时间**，回到 `.repair.lock`。

---

## 6. 排查思路备忘（给未来的自己）

这次排查走过的弯路，记下来避免重复：

1. **误判一：以为是管理员权限问题。**
   部分正确——提权运行确实会跳过服务（见 3.6），但降为普通用户后服务能装上、内核依然起不来。不是根因。

2. **误判二：以为是端口/TUN 被 FlClash、Soho 抢占。**
   完全错误。禁用那两个服务、`netstat` 输出为空后，`os error 258` 照旧。

3. **误判三：以为是代码问题，准备回滚版本。**
   完全错误。新旧版本症状一模一样，说明问题在机器状态而非代码。**回滚 149 个提交毫无意义。**

4. **找到根因的关键动作：**
   - 对比 `sc.exe query`（说未安装）与 `C:\ProgramData\clash-verge-service\` 文件时间戳（今天刚写）——**这个矛盾直接指向真相**
   - 注意到 `.repair.lock` 是 0 字节且是 13 小时前创建的
   - 手工运行安装器，绕过被隐藏窗口吞掉的报错

**通用教训**：当「换版本症状不变」时，先查机器状态（锁文件、注册项、残留进程），不要改代码。
