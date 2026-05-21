interface AvatarProps {
  src?: string
  alt?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function Avatar({ src, alt = 'Avatar', size = 'md' }: AvatarProps) {
  const sizes = { sm: 'w-8 h-8', md: 'w-12 h-12', lg: 'w-20 h-20' }
  return src
    ? <img className={`${sizes[size]} rounded-full object-cover`} src={src} alt={alt} />
    : <div className={`${sizes[size]} rounded-full bg-gray-200 flex items-center justify-center text-gray-400`}>{alt[0]}</div>
}
