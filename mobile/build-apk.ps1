param([string]$JavaHome="", [string]$SdkRoot="")
$ErrorActionPreference='Stop'
Set-Location $PSScriptRoot
$projectRoot=Split-Path $PSScriptRoot -Parent
if (!$JavaHome) { $JavaHome=(Get-ChildItem "$projectRoot/output/android-tools/jdk" -Directory | Select-Object -First 1).FullName }
if (!$SdkRoot) { $SdkRoot="$projectRoot/output/android-tools/sdk" }
$env:JAVA_HOME=$JavaHome
$env:GRADLE_USER_HOME="$PSScriptRoot/.gradle-cache"
if ($env:HTTPS_PROXY) { $buildProxy=[Uri]$env:HTTPS_PROXY; $env:GRADLE_OPTS="-Dhttps.proxyHost=$($buildProxy.Host) -Dhttps.proxyPort=$($buildProxy.Port) -Dhttp.proxyHost=$($buildProxy.Host) -Dhttp.proxyPort=$($buildProxy.Port)" }
[IO.File]::WriteAllText("$PSScriptRoot/android/local.properties","sdk.dir="+$SdkRoot.Replace('\','/')+[Environment]::NewLine)
node build-web.cjs
if ($LASTEXITCODE) { throw 'Web build failed' }
npx cap sync android
if ($LASTEXITCODE) { throw 'Capacitor sync failed' }
Push-Location android
try { & ./gradlew.bat :app:assembleRelease --console=plain; if ($LASTEXITCODE) { throw 'Android build failed' } } finally { Pop-Location }
$signingDir="$PSScriptRoot/.signing"
New-Item -ItemType Directory -Force $signingDir,"$projectRoot/output/apk" | Out-Null
if (!(Test-Path "$signingDir/release.jks")) {
 $signingPassword=[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(36))
 [IO.File]::WriteAllText("$signingDir/password.txt",$signingPassword)
 $env:YEJIAN_SIGN_PASSWORD=$signingPassword
 & "$JavaHome/bin/keytool.exe" -genkeypair -keystore "$signingDir/release.jks" -storepass:env YEJIAN_SIGN_PASSWORD -keypass:env YEJIAN_SIGN_PASSWORD -alias yejian -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=Yejian Personal Reading'
 if ($LASTEXITCODE) { throw 'Signing key creation failed' }
}
$env:YEJIAN_SIGN_PASSWORD=[IO.File]::ReadAllText("$signingDir/password.txt")
$apk="$projectRoot/output/apk/yejian-1.0.0.apk"
& "$SdkRoot/build-tools/36.0.0/zipalign.exe" -f -p 4 "$PSScriptRoot/android/app/build/outputs/apk/release/app-release-unsigned.apk" "$projectRoot/output/apk/yejian-aligned.apk"
if ($LASTEXITCODE) { throw 'APK alignment failed' }
& "$SdkRoot/build-tools/36.0.0/apksigner.bat" sign --ks "$signingDir/release.jks" --ks-key-alias yejian --ks-pass env:YEJIAN_SIGN_PASSWORD --key-pass env:YEJIAN_SIGN_PASSWORD --out $apk "$projectRoot/output/apk/yejian-aligned.apk"
if ($LASTEXITCODE) { throw 'APK signing failed' }
& "$SdkRoot/build-tools/36.0.0/apksigner.bat" verify --verbose $apk
if ($LASTEXITCODE) { throw 'APK signature verification failed' }
Remove-Item Env:YEJIAN_SIGN_PASSWORD
Remove-Item -LiteralPath "$projectRoot/output/apk/yejian-aligned.apk"
(Get-FileHash $apk -Algorithm SHA256).Hash | Set-Content "$apk.sha256"
Write-Output "APK: $apk"
