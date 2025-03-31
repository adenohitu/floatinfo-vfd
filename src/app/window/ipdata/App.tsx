import styles from "./app.module.scss";
import { ClientIP } from "../../components/IpInfo/ClientIP";
import { Name } from "../../components/IpInfo/Name";
import { Organization } from "../../components/IpInfo/Organization";
import { Tile } from "../../components/Tile/Tile";
import { useIpdata } from "../../hooks/useipdata";

export function App() {
  const ipData = useIpdata();

  if (!ipData) {
    return (
      <div className={styles.windowParent}>
        <Tile text="Loading..." />
      </div>
    );
  }

  return (
    <div className={styles.windowParent}>
      <ClientIP />
      <Name />
      <Organization />
    </div>
  );
}
