#!/bin/sh
# Rebuilds shell/shell-template.apk, the native Android wrapper every game is packed into.
# Only needed after changing the Java code, the manifest or res/. Packing games into
# it happens in the browser (src/studio/apk).
#
# Needs a JDK 17+ and the Android SDK packages "platforms;android-36" and
# "build-tools;36.1.0" (or set BUILD_TOOLS / PLATFORM).
set -eu
cd "$(dirname "$0")"

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
BUILD_TOOLS="${BUILD_TOOLS:-$SDK/build-tools/36.1.0}"
PLATFORM="${PLATFORM:-$SDK/platforms/android-36/android.jar}"
if [ -z "${JAVA_HOME:-}" ] && [ -d /opt/homebrew/opt/openjdk@21 ]; then
    JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
fi
JAVAC="${JAVA_HOME:+$JAVA_HOME/bin/}javac"
export JAVA_HOME

rm -rf build
mkdir -p build/res build/classes build/dex

"$BUILD_TOOLS/aapt2" compile --dir res -o build/res/
"$BUILD_TOOLS/aapt2" link -o build/base.apk -I "$PLATFORM" \
    --manifest AndroidManifest.xml \
    --min-sdk-version 24 --target-sdk-version 36 \
    --version-code 1 --version-name SHELL_VERSION_NAME \
    build/res/*.flat

"$JAVAC" --release 11 -Xlint:-options -classpath "$PLATFORM" -d build/classes \
    $(find src -name '*.java')
"$BUILD_TOOLS/d8" --release --min-api 24 --lib "$PLATFORM" --output build/dex \
    $(find build/classes -name '*.class')

cp build/base.apk shell-template.apk
(cd build/dex && zip -q -X ../../shell-template.apk classes.dex)
rm -rf build
echo "wrote shell/shell-template.apk ($(wc -c < shell-template.apk | tr -d ' ') bytes)"
