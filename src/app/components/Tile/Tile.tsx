import styles from './Tile.module.scss';

interface TileProps {
  text: string;
  oneLineLimit?: boolean;
  twoLineLimit?: boolean;
}

export const Tile: React.FC<TileProps> = ({ text, oneLineLimit, twoLineLimit }) => {
  const className = `${styles.tile} ${oneLineLimit ? styles.lineLimitone : ''} ${
    twoLineLimit ? styles.lineLimittwo : ''
  }`;

  return <h1 className={className}>{text}</h1>;
};