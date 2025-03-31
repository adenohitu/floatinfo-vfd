import { PrimitiveAtom, atom, useAtom } from 'jotai';
import { useEffect } from 'react';
import { ipStatusApiResponse } from '../../types/ipcheck';

const ipDataAtom: PrimitiveAtom<ipStatusApiResponse> = atom<ipStatusApiResponse>({
  ClientIP: "",
  Name: "",
  Organization: "",
  status: "ok",
});

export const useIpdata = () => {
  const [ipData, setIpData] = useAtom(ipDataAtom);

  const fetchIpData = async () => {
    try {
      const iprawData = await window.electronAPI.getgrovalIP();
      setIpData(iprawData);
    } catch (error) {
      console.error('Failed to fetch IP data:', error);
    }
  };

  useEffect(() => {
    fetchIpData();
  }, []);

  useEffect(() => {
    window.electronAPI.updateEventSend(() => {
      fetchIpData();
    });
  }, []);

  useEffect(() => {
    const updateOnlineStatus = () => {
      if (navigator.onLine) {
        fetchIpData();
      } else {
        setIpData({
          ClientIP: "offline",
          Name: "",
          Organization: "",
          status: "offline",
        });
      }
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    updateOnlineStatus();

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    const intervalId = setInterval(fetchIpData, 30000);
    return () => clearInterval(intervalId);
  }, []);

  return ipData;
};