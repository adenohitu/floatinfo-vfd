import React, { useEffect, useState } from 'react';

export function Setting() {
  const [ipCheckUrl, setIpCheckUrl] = useState('');

  useEffect(() => {
    window.electronAPI.getConfig().then((config) => {
      setIpCheckUrl(config.ipCheckUrl);
    });
  }, []);

  const handleSave = () => {
    window.electronAPI.setConfig({ ipCheckUrl });
  };

  return (
    <div>
      <h2>Settings</h2>
      <div>
        <label>
          IP Check URL:
          <input 
            type="text" 
            value={ipCheckUrl} 
            onChange={(e) => setIpCheckUrl(e.target.value)}
          />
        </label>
      </div>
      <button onClick={handleSave}>Save</button>
    </div>
  );
}