# Build Android APK for KaloriKu
$ErrorActionPreference = "Stop"

$SDK_DIR = "C:\Users\neddy\AppData\Local\Android\Sdk"
$BUILD_TOOLS = "$SDK_DIR\build-tools\34.0.0"
$PLATFORM_JAR = "$SDK_DIR\platforms\android-34\android.jar"
$JAVA_HOME = "C:\Program Files\Java\jdk-20"

$AAPT2 = "$BUILD_TOOLS\aapt2.exe"
$D8 = "$BUILD_TOOLS\d8.bat"
$ZIPALIGN = "$BUILD_TOOLS\zipalign.exe"
$APKSIGNER = "$BUILD_TOOLS\apksigner.bat"
$JAVAC = "$JAVA_HOME\bin\javac.exe"
$JAR = "$JAVA_HOME\bin\jar.exe"
$KEYTOOL = "$JAVA_HOME\bin\keytool.exe"

$ROOT = Split-Path -Parent $PSScriptRoot
$APP_DIR = "$ROOT\android\app\src\main"
$BUILD_DIR = "$ROOT\android\build"

Write-Host "🚀 Building KaloriKu Android APK..."

# Clean & create build folders
if (Test-Path $BUILD_DIR) { Remove-Item -Recurse -Force $BUILD_DIR }
New-Item -ItemType Directory -Force -Path "$BUILD_DIR\gen", "$BUILD_DIR\classes", "$BUILD_DIR\dex" | Out-Null
New-Item -ItemType Directory -Force -Path "$ROOT\frontend\public\downloads", "$ROOT\dist\downloads" | Out-Null

# 1. Compile Resources
Write-Host "  [1/6] Mengompilasi resource dengan aapt2..."
& $AAPT2 compile --dir "$APP_DIR\res" -o "$BUILD_DIR\compiled_res.zip"

# 2. Link Resources
Write-Host "  [2/6] Menautkan resource dan menghasilkan R.java..."
& $AAPT2 link -o "$BUILD_DIR\unaligned.apk" -I $PLATFORM_JAR --manifest "$APP_DIR\AndroidManifest.xml" -R "$BUILD_DIR\compiled_res.zip" --auto-add-overlay --java "$BUILD_DIR\gen"

# 3. Compile Java Source Code
Write-Host "  [3/6] Mengompilasi kode Java..."
$JAVA_FILES = @(
    "$BUILD_DIR\gen\com\bimapratama\kaloriku\R.java",
    "$APP_DIR\java\com\bimapratama\kaloriku\MainActivity.java"
)
& $JAVAC -encoding UTF-8 --release 8 -Xlint:-options -cp $PLATFORM_JAR -d "$BUILD_DIR\classes" $JAVA_FILES

# 4. Convert Classes to DEX
Write-Host "  [4/6] Mengubah bytecode ke Dalvik Executable (classes.dex)..."
$CLASS_FILES = Get-ChildItem -Path "$BUILD_DIR\classes" -Recurse -Filter *.class | Select-Object -ExpandProperty FullName
$CLASS_ARGS = ($CLASS_FILES | ForEach-Object { "`"$_`"" }) -join ' '
& cmd.exe /c "`"$D8`" --output `"$BUILD_DIR\dex`" --lib `"$PLATFORM_JAR`" $CLASS_ARGS"

# 5. Pack classes.dex into unaligned APK
Write-Host "  [5/6] Memasukkan classes.dex ke paket APK..."
Push-Location "$BUILD_DIR\dex"
& $JAR uf "$BUILD_DIR\unaligned.apk" classes.dex
Pop-Location

# Align APK
& $ZIPALIGN -p -f 4 "$BUILD_DIR\unaligned.apk" "$BUILD_DIR\aligned.apk"

# 6. Generate Keystore & Sign APK
Write-Host "  [6/6] Menandatangani APK (Signing)..."
$KEYSTORE = "$ROOT\android\kaloriku.keystore"
if (-not (Test-Path $KEYSTORE)) {
    & $KEYTOOL -genkeypair -v -keystore $KEYSTORE -alias kaloriku -keyalg RSA -keysize 2048 -validity 10000 -storepass kaloriku123 -keypass kaloriku123 -dname "CN=KaloriKu, O=BimaPratama, C=ID"
}

$FINAL_APK = "$ROOT\frontend\public\downloads\KaloriKu.apk"
& cmd.exe /c "$APKSIGNER sign --ks `"$KEYSTORE`" --ks-pass pass:kaloriku123 --ks-key-alias kaloriku --key-pass pass:kaloriku123 --out `"$FINAL_APK`" `"$BUILD_DIR\aligned.apk`""

# Copy to dist as well
Copy-Item -Force $FINAL_APK "$ROOT\dist\downloads\KaloriKu.apk"

$apkSize = (Get-Item $FINAL_APK).Length / 1KB
Write-Host "🎉 SUKSES! File APK telah dibuat di:"
Write-Host "   -> $FINAL_APK ($([math]::Round($apkSize, 1)) KB)"
