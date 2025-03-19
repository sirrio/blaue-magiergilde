interface LogoEtProps {
  width?: number
}

const DEFAULT_WIDTH = 18

export default function LogoEt({ width = DEFAULT_WIDTH }: LogoEtProps) {
  return (
    <div className={'inline-block'}>
      <img src="/images/mg-et.png" width={width} alt="et" />
    </div>
  )
}
