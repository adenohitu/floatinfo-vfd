import { Tile } from "../Tile/Tile";
import { useIpdata } from "../../hooks/useipdata";

export const Name = () => {
  const ipData = useIpdata();
  
  if (!ipData?.Name) {
    return null;
  }

  return <Tile text={ipData.Name} oneLineLimit />;
};