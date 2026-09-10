package com.ondevicementor

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import androidx.core.content.FileProvider
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/**
 * StorageBridgeModule - Android 端侧存储桥接与权限直达模块
 * 
 * 核心能力：
 * 1. 精准直跳 Android 11+ 的“所有文件访问权限”系统设置页（带有 package 参数，开关直接呈现在用户面前）。
 * 2. 获取 App 专属无需任何权限的私有目录（getExternalFilesDir）。
 * 3. 安全快速从 content:// URI 复制模型进应用私有沙盒。
 */
class StorageBridgeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "StorageBridge"

    /**
     * 检查是否已拥有“所有文件管理权限”
     */
    @ReactMethod
    fun isAllFilesAccessGranted(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            promise.resolve(Environment.isExternalStorageManager())
        } else {
            promise.resolve(true)
        }
    }

    /**
     * 直达系统“所有文件访问权限”开关页
     */
    @ReactMethod
    fun requestAllFilesAccess(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            try {
                val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION)
                intent.data = Uri.parse("package:" + reactContext.packageName)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactContext.startActivity(intent)
                promise.resolve(true)
            } catch (e: Exception) {
                try {
                    val intent = Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    reactContext.startActivity(intent)
                    promise.resolve(true)
                } catch (e2: Exception) {
                    promise.reject("ERR_INTENT", e2.message)
                }
            }
        } else {
            promise.resolve(true)
        }
    }

    /**
     * 获取应用相关的多级存储路径（供模型寻址与无需权限的沙盒使用）
     */
    @ReactMethod
    fun getAppStoragePaths(promise: Promise) {
        try {
            val map = Arguments.createMap()
            val externalDir = reactContext.getExternalFilesDir(null)?.absolutePath ?: ""
            val internalDir = reactContext.filesDir.absolutePath
            val downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS).absolutePath
            val isManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) Environment.isExternalStorageManager() else true

            map.putString("appExternalFilesDir", externalDir)
            map.putString("appInternalFilesDir", internalDir)
            map.putString("downloadDir", downloadDir)
            map.putBoolean("isAllFilesAccessGranted", isManager)

            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERR_STORAGE_PATHS", e.message)
        }
    }

    /**
     * 检测指定绝对路径是否真实可读
     */
    @ReactMethod
    fun checkFileReadable(path: String, promise: Promise) {
        try {
            val file = File(path)
            promise.resolve(file.exists() && file.canRead())
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    /**
     * 将通过系统文件选择器选取的 content:// 文件快速复制进专属免权限目录
     */
    @ReactMethod
    fun copyContentUriToAppStorage(contentUriString: String, destFileName: String, promise: Promise) {
        thread {
            try {
                val uri = Uri.parse(contentUriString)
                val targetDir = reactContext.getExternalFilesDir("models") ?: reactContext.filesDir
                if (!targetDir.exists()) {
                    targetDir.mkdirs()
                }
                val destFile = File(targetDir, destFileName)

                reactContext.contentResolver.openInputStream(uri)?.use { input ->
                    FileOutputStream(destFile).use { output ->
                        val buffer = ByteArray(1024 * 1024) // 1MB 缓冲区快速流转
                        var bytesRead: Int
                        while (input.read(buffer).also { bytesRead = it } != -1) {
                            output.write(buffer, 0, bytesRead)
                        }
                        output.flush()
                    }
                }

                promise.resolve(destFile.absolutePath)
            } catch (e: Exception) {
                promise.reject("ERR_COPY", e.message)
            }
        }
    }

    /**
     * 持久化配置键值存储（用于自动记忆上次成功挂载的模型等）
     */
    @ReactMethod
    fun saveString(key: String, value: String, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("on_device_mentor_prefs", android.content.Context.MODE_PRIVATE)
            prefs.edit().putString(key, value).apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_SAVE", e.message)
        }
    }

    /**
     * 读取持久化配置
     */
    @ReactMethod
    fun getString(key: String, defaultValue: String, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("on_device_mentor_prefs", android.content.Context.MODE_PRIVATE)
            val v = prefs.getString(key, defaultValue) ?: defaultValue
            promise.resolve(v)
        } catch (e: Exception) {
            promise.resolve(defaultValue)
        }
    }

    /**
     * 获取当前 App 的版本信息 (versionCode, versionName)
     */
    @ReactMethod
    fun getAppVersionInfo(promise: Promise) {
        try {
            val pInfo = reactContext.packageManager.getPackageInfo(reactContext.packageName, 0)
            val vCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                pInfo.longVersionCode
            } else {
                @Suppress("DEPRECATION")
                pInfo.versionCode.toLong()
            }
            val map = Arguments.createMap()
            map.putDouble("versionCode", vCode.toDouble())
            map.putString("versionName", pInfo.versionName ?: "1.0.0")
            map.putString("packageName", reactContext.packageName)
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERR_VERSION", e.message)
        }
    }

    /**
     * 检查当前系统是否允许安装未知来源应用 (Android 8.0+)
     */
    @ReactMethod
    fun canRequestPackageInstalls(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            promise.resolve(reactContext.packageManager.canRequestPackageInstalls())
        } else {
            promise.resolve(true)
        }
    }

    /**
     * 调起系统“允许从此来源安装应用”设置页
     */
    @ReactMethod
    fun openInstallPermissionSettings(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                    data = Uri.parse("package:${reactContext.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactContext.startActivity(intent)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR_UNKNOWN_SOURCES", e.message)
            }
        } else {
            promise.resolve(true)
        }
    }

    /**
     * 流式下载 APK 文件并实时发射进度事件 (run on background thread)
     */
    @ReactMethod
    fun downloadApk(downloadUrl: String, destFileName: String, promise: Promise) {
        thread {
            var connection: HttpURLConnection? = null
            var inputStream: InputStream? = null
            var outputStream: FileOutputStream? = null
            try {
                val targetDir = reactContext.externalCacheDir ?: reactContext.cacheDir
                val destFile = File(targetDir, destFileName)
                if (destFile.exists()) {
                    destFile.delete()
                }

                val url = URL(downloadUrl)
                connection = url.openConnection() as HttpURLConnection
                connection.connectTimeout = 15000
                connection.readTimeout = 60000
                connection.instanceFollowRedirects = true
                connection.connect()

                if (connection.responseCode != HttpURLConnection.HTTP_OK) {
                    promise.reject("ERR_DOWNLOAD_HTTP", "Server returned HTTP ${connection.responseCode}")
                    return@thread
                }

                val fileLength = connection.contentLength.toLong()
                inputStream = connection.inputStream
                outputStream = FileOutputStream(destFile)

                val data = ByteArray(64 * 1024) // 64KB 缓冲区
                var total: Long = 0
                var count: Int
                var lastEmitTime: Long = 0

                while (inputStream.read(data).also { count = it } != -1) {
                    total += count
                    outputStream.write(data, 0, count)

                    val now = System.currentTimeMillis()
                    if (now - lastEmitTime > 150 || total == fileLength) {
                        lastEmitTime = now
                        val eventMap = Arguments.createMap().apply {
                            putDouble("bytesWritten", total.toDouble())
                            putDouble("totalBytes", fileLength.toDouble())
                            putDouble("percent", if (fileLength > 0) (total * 100.0 / fileLength) else 0.0)
                        }
                        try {
                            reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                                ?.emit("onApkDownloadProgress", eventMap)
                        } catch (_: Exception) {}
                    }
                }
                outputStream.flush()
                promise.resolve(destFile.absolutePath)
            } catch (e: Exception) {
                promise.reject("ERR_DOWNLOAD", e.message)
            } finally {
                try { outputStream?.close() } catch (_: Exception) {}
                try { inputStream?.close() } catch (_: Exception) {}
                connection?.disconnect()
            }
        }
    }

    /**
     * 调用系统安装器安装指定路径的 APK 文件 (使用 FileProvider)
     */
    @ReactMethod
    fun installApk(filePath: String, promise: Promise) {
        try {
            val file = File(filePath)
            if (!file.exists()) {
                promise.reject("ERR_FILE_NOT_FOUND", "APK file does not exist at $filePath")
                return
            }

            val apkUri = FileProvider.getUriForFile(
                reactContext,
                "${reactContext.packageName}.fileprovider",
                file
            )

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(apkUri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_INSTALL", e.message)
        }
    }
}
