interface LogoHtProps {
  width?: number
}

const DEFAULT_WIDTH = 18

export default function LogoHt({ width = DEFAULT_WIDTH }: LogoHtProps) {
  return (
    <div className="inline-block">
      <img src="/images/mg-ht.png" width={width} alt="Logo HT" />
    </div>
  )
}
