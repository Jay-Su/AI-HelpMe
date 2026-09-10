import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { StorageBridge } = NativeModules;

export interface RemoteVersionInfo {
  versionCode: number;
  versionName: string;
  releaseNotes: string;
  downloadUrl: string;
  forceUpdate?: boolean;
}

export interface LocalVersionInfo {
  versionCode: number;
  versionName: string;
  packageName: string;
}

export interface DownloadProgress {
  bytesWritten: number;
  totalBytes: number;
  percent: number;
}

export const DEFAULT_UPDATE_URL = 'http://192.168.63.135:8888/version.json';

class UpdateServiceClass {
  private eventEmitter: NativeEventEmitter | null = null;

  constructor() {
    if (Platform.OS === 'android' && StorageBridge) {
      this.eventEmitter = new NativeEventEmitter(StorageBridge);
    }
  }

  async getUpdateServerUrl(): Promise<string> {
    if (StorageBridge?.getString) {
      try {
        const saved = await StorageBridge.getString('setting_update_url', DEFAULT_UPDATE_URL);
        return saved || DEFAULT_UPDATE_URL;
      } catch (e) {
        return DEFAULT_UPDATE_URL;
      }
    }
    return DEFAULT_UPDATE_URL;
  }

  async setUpdateServerUrl(url: string): Promise<boolean> {
    if (StorageBridge?.saveString) {
      try {
        await StorageBridge.saveString('setting_update_url', url.trim());
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  async getLocalVersionInfo(): Promise<LocalVersionInfo> {
    if (StorageBridge?.getAppVersionInfo) {
      try {
        const info = await StorageBridge.getAppVersionInfo();
        return {
          versionCode: Number(info.versionCode) || 1,
          versionName: String(info.versionName || '1.0.0'),
          packageName: String(info.packageName || 'com.ondevicementor'),
        };
      } catch (e) {
        // Fallback
      }
    }
    return {
      versionCode: 1,
      versionName: '1.0.0',
      packageName: 'com.ondevicementor',
    };
  }

  async checkUpdate(customUrl?: string, timeoutMs: number = 6000): Promise<{
    hasUpdate: boolean;
    remote: RemoteVersionInfo | null;
    local: LocalVersionInfo;
    error?: string;
  }> {
    const local = await this.getLocalVersionInfo();
    const url = customUrl || (await this.getUpdateServerUrl());

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      clearTimeout(timer);

      if (!res.ok) {
        return { hasUpdate: false, remote: null, local, error: 'HTTP ' + res.status };
      }

      const remote: RemoteVersionInfo = await res.json();
      const hasUpdate = remote.versionCode > local.versionCode;

      return {
        hasUpdate,
        remote,
        local,
      };
    } catch (e: any) {
      return {
        hasUpdate: false,
        remote: null,
        local,
        error: e.message || '网络连接超时',
      };
    }
  }

  async downloadAndInstall(
    downloadUrl: string,
    onProgress?: (p: DownloadProgress) => void
  ): Promise<boolean> {
    if (!StorageBridge?.downloadApk || !StorageBridge?.installApk) {
      throw new Error('原生下载安装模块未就绪');
    }

    let subscription: any = null;
    if (this.eventEmitter && onProgress) {
      subscription = this.eventEmitter.addListener('onApkDownloadProgress', (event: DownloadProgress) => {
        onProgress(event);
      });
    }

    try {
      const destPath = await StorageBridge.downloadApk(downloadUrl, 'ai_zhuwo_update.apk');
      if (subscription) {
        subscription.remove();
      }

      await StorageBridge.installApk(destPath);
      return true;
    } catch (e: any) {
      if (subscription) {
        subscription.remove();
      }
      throw e;
    }
  }
}

export const UpdateService = new UpdateServiceClass();
