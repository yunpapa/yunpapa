const sizeMap = {
  sm: 'w-4 h-4 border-2',
  md: 'w-7 h-7 border-2',
  lg: 'w-12 h-12 border-4',
}

export default function Spinner({ size = 'md', fullScreen = false }) {
  const spinner = (
    <div
      className={`${sizeMap[size]} rounded-full border-blue-200 border-t-blue-600 animate-spin`}
    />
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/70">
        {spinner}
      </div>
    )
  }

  return spinner
}
