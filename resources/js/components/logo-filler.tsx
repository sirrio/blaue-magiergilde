interface LogoFillerProps {
  width?: number
}

const DEFAULT_WIDTH = 18

export default function LogoFiller({ width = DEFAULT_WIDTH }: LogoFillerProps) {
  return (
    <div className="inline-block">
      <img src="/images/filler.svg" width={width} alt="filler" />
    </div>
  )
}
