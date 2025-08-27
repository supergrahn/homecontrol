# Android Studio Setup Guide

This guide covers installing Android Studio, SDKs, and JDK 17 for development on Windows and WSL (Windows Subsystem for Linux).

---

## 1. Install Android Studio (Windows)

1. **Download Android Studio:**
   - Visit [developer.android.com/studio](https://developer.android.com/studio).
   - Download the installer for Windows.

2. **Run the Installer:**
   - Double-click the downloaded `.exe` file.
   - Follow the setup wizard to install Android Studio and the Android SDK.

3. **Install Android SDKs:**
   - Open Android Studio.
   - Go to **Tools > SDK Manager**.
   - Install required SDK platforms and tools (recommend latest stable).

4. **Install Android Emulator (Optional):**
   - In SDK Manager, install "Android Emulator" and desired device images.
   - You can run emulators from Android Studio.

---

## 2. Install JDK 17 (Windows)

Android Studio bundles a JDK, but you can install OpenJDK 17 if needed:

1. **Download OpenJDK 17:**
   - [Adoptium Temurin JDK 17](https://adoptium.net/temurin/releases/?version=17)
2. **Install and set JAVA_HOME:**
   - Extract and set environment variable `JAVA_HOME` to the JDK path.

---

## 3. WSL Setup (Linux Subsystem)

You can use WSL for CLI builds, but not for running Android Studio GUI or emulators.

### Install JDK 17 in WSL

```sh
sudo apt update
sudo apt install openjdk-17-jdk
```

### Install Android SDK Command-Line Tools in WSL

1. **Download SDK Tools:**
   - Go to [Android command line tools](https://developer.android.com/studio#command-tools).
   - Download and unzip in your WSL home directory.

2. **Set Environment Variables:**
   Add to your `~/.bashrc` or `~/.zshrc`:
   ```sh
   export ANDROID_HOME=$HOME/android-sdk
   export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$PATH
   ```

3. **Install SDK Packages:**
   ```sh
   sdkmanager "platform-tools" "platforms;android-34"
   ```

---

## 4. Building Android Apps

- **On Windows:** Use Android Studio for full development, debugging, and emulators.
- **On WSL:** Use CLI tools for building and testing, but connect to devices/emulators running on Windows.

---

## 5. Troubleshooting

- **Emulator not working in WSL:** Emulators require Windows GUI; run them from Android Studio on Windows.
- **File access:** Share project folders between Windows and WSL for seamless development.
- **Node/Expo:** Install Node.js and Expo CLI in WSL for React Native development.

---

## References

- [Android Studio Official Docs](https://developer.android.com/studio)
-