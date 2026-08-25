'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('qaEstimator', {
  credentials: {
    save: (payload) => ipcRenderer.invoke('credentials:save', payload),
    load: () => ipcRenderer.invoke('credentials:load'),
    clear: () => ipcRenderer.invoke('credentials:clear'),
    hasSaved: () => ipcRenderer.invoke('credentials:hasSaved'),
  },
  azure: {
    testConnection: (overrideCreds) => ipcRenderer.invoke('azure:testConnection', overrideCreds),
  },
  estimate: {
    prepareSuggestion: (storyId) => ipcRenderer.invoke('estimate:prepareSuggestion', { storyId }),
    finalize: (payload) => ipcRenderer.invoke('estimate:finalize', payload),
  },
  history: {
    getAll: () => ipcRenderer.invoke('history:getAll'),
    getByStoryId: (storyId) => ipcRenderer.invoke('history:getByStoryId', storyId),
  },
});
