import '../../../components/sectionNav.css'

type ComingSoonPageProps = {
  title: string
  description: string
}

export function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  return (
    <main className="coming-soon-page">
      <h1>{title}</h1>
      <p>{description}</p>
      <p className="coming-soon-badge" role="status">
        Coming soon
      </p>
    </main>
  )
}
