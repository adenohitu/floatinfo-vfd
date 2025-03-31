import { Tile } from "../Tile/Tile";
import { useIpdata } from "../../hooks/useipdata";

export const ClientIP = () => {
  const ipData = useIpdata();
  
  if (!ipData?.ClientIP) {
    return null;
  }

  return <Tile text={ipData.ClientIP} oneLineLimit />;
};