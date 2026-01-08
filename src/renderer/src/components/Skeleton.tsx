import React from 'react'

interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', width, height }) => {
  const style: React.CSSProperties = {}
  if (width) style.width = width
  if (height) style.height = height

  return <div className={`bg-white/5 animate-pulse rounded ${className}`} style={style} />
}
