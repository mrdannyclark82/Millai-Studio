
export interface BackupData {
  timestamp: number;
  version: string;
  data: {
    history: any;
    facts: any;
    tasks: any;
    files: any;
    studioImages: any;
    preferences: any;
  }
}

const STORAGE_KEYS = {
  history: 'milla_chat_history',
  facts: 'milla_core_facts',
  tasks: 'milla_tasks',
  files: 'milla_sandbox_files',
  studioImages: 'milla_creative_studio_images',
};

export const backupService = {
  createBackup: (): BackupData => {
    return {
      timestamp: Date.now(),
      version: '1.0',
      data: {
        history: localStorage.getItem(STORAGE_KEYS.history),
        facts: localStorage.getItem(STORAGE_KEYS.facts),
        tasks: localStorage.getItem(STORAGE_KEYS.tasks),
        files: localStorage.getItem(STORAGE_KEYS.files),
        studioImages: localStorage.getItem(STORAGE_KEYS.studioImages),
        preferences: {
            google_client_id: localStorage.getItem('google_client_id'),
            // Add other preference keys if needed
        }
      }
    };
  },

  downloadBackup: () => {
    const backup = backupService.createBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `milla-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  restoreBackup: async (file: File): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const backup: BackupData = JSON.parse(content);

          if (!backup.data) throw new Error("Invalid backup file format");

          // Restore Keys
          if (backup.data.history) localStorage.setItem(STORAGE_KEYS.history, backup.data.history);
          if (backup.data.facts) localStorage.setItem(STORAGE_KEYS.facts, backup.data.facts);
          if (backup.data.tasks) localStorage.setItem(STORAGE_KEYS.tasks, backup.data.tasks);
          if (backup.data.files) localStorage.setItem(STORAGE_KEYS.files, backup.data.files);
          if (backup.data.studioImages) localStorage.setItem(STORAGE_KEYS.studioImages, backup.data.studioImages);
          
          if (backup.data.preferences?.google_client_id) {
              localStorage.setItem('google_client_id', backup.data.preferences.google_client_id);
          }

          resolve(true);
        } catch (err) {
          console.error(err);
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  }
};
