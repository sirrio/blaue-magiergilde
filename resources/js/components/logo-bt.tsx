interface LogoBtProps {
  width?: number
}

const DEFAULT_WIDTH = 18

export default function LogoBt({ width = DEFAULT_WIDTH }: LogoBtProps) {
  return (
    <div className="inline-block">
      <img src="/images/mg-bt.png" width={width} alt="bt" />
    </div>
  )
}
