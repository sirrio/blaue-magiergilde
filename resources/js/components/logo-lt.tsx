interface LogoLtProps {
  width?: number
}

const DEFAULT_WIDTH = 18

export default function LogoLt({ width = DEFAULT_WIDTH }: LogoLtProps) {
  return (
    <div className="inline-block">
      <img src="/images/mg-lt.png" width={width} alt="lt" />
    </div>
  )
}
