import { useEffect } from "react";
import { listen, type Event } from "@tauri-apps/api/event";

export type FilePayload = {
  path: string;
  content: string;
  updated_at: number;
};

export type FileMissingPayload = {
  path: string;
  message: string;
  updated_at: number;
};

type WatcherHandlers = {
  onChanged: (payload: FilePayload) => void;
  onMissing: (payload: FileMissingPayload) => void;
};

export function useFileWatcher({ onChanged, onMissing }: WatcherHandlers) {
  useEffect(() => {
    let isDisposed = false;

    const setup = async () => {
      const unlistenChanged = await listen<FilePayload>("file-changed", (event: Event<FilePayload>) => {
        if (!isDisposed) {
          onChanged(event.payload);
        }
      });

      const unlistenMissing = await listen<FileMissingPayload>("file-missing", (event: Event<FileMissingPayload>) => {
        if (!isDisposed) {
          onMissing(event.payload);
        }
      });

      return () => {
        unlistenChanged();
        unlistenMissing();
      };
    };

    let cleanup: undefined | (() => void);
    setup().then((fn) => {
      cleanup = fn;
    });

    return () => {
      isDisposed = true;
      cleanup?.();
    };
  }, [onChanged, onMissing]);
}
