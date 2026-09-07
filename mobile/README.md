 # 页间 Android

输出 output/apk/yejian-1.0.0.apk，支持 Android 7.0 及以上，建议更新 Android System WebView。

页面、书架、笔记和 OCR 资源在手机本地，平台资料使用原生 HTTPS 请求，不依赖电脑。设置中配置 DeepSeek API Key，保存在应用私有 Preferences；电脑密钥不打入 APK。关闭系统自动备份，可主动导出 JSON。首次安装不带电脑数据，可从电脑预览设置导出，再到手机设置导入。合并新书时保留手机已有记录。

番茄关键词搜索仍不可用；支持作品链接/ID、作者主页链接/ID和截图确认。

构建：mobile 目录 npm ci，然后 ./build-apk.ps1。可传 -JavaHome 和 -SdkRoot，默认使用 output/android-tools 内的 JDK21、Android SDK36。需要 platforms;android-36、build-tools;36.0.0、platform-tools。

构建复用 backend 解析函数和 AI 提示词。mobile/runtime.js 负责网络、设置和备份；build-web.cjs 生成 www 和 generated。固定签名保存在 mobile/.signing（Git忽略），请保留以供覆盖升级；后续提升 android/app/build.gradle 的 versionCode。

验证：浏览器运行手机版 bundle，通过原生 HTTP 格式替身读取真实晋江/番茄资料，并验证设置和本地用户截图 OCR。APK另作编译签名检查。目前没有连接真机，尚未验证真机启动、文件选择器和系统分享面板。
