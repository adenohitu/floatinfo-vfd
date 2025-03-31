import { Tile } from "../Tile/Tile";
import { useIpdata } from "../../hooks/useipdata";

export const Organization = () => {
  const ipData = useIpdata();
  
  if (!ipData?.Organization) {
    return null;
  }

  return <Tile text={ipData.Organization} twoLineLimit />;
};