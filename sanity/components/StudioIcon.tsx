/**
 * Studio workspace icon (replaces the default "TP" initials badge in the
 * navbar). Mirrors the `crown` pattern in components/common/PixelIcon.
 */

const CROWN = [
  "#  ##  #",
  "#  ##  #",
  "########",
  "########",
  "########",
  "        ",
  "        ",
  "        ",
]

export default function StudioIcon() {
  const rects: React.ReactElement[] = []

  CROWN.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '#') {
        rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />)
      }
    }
  })

  return (
    <svg viewBox="0 0 8 8" fill="#c2521f" shapeRendering="crispEdges" width="100%" height="100%">
      {rects}
    </svg>
  )
}
