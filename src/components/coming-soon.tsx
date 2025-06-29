interface ComingSoonProps {
  title: string
  description?: string
}

export default function ComingSoon({ title, description = "Coming soon..." }: ComingSoonProps) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <h2 className="text-2xl font-semibold mb-2">{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  )
}