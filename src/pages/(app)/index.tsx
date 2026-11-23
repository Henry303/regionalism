import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthOverlay, useAuth } from 'deepspace'
import { MapPin } from 'lucide-react'
import { Button } from '@/components/ui'
import { APP_NAME } from '../../constants'
import { Seo } from '../../components/Seo'
import { seo } from '../../seo'

export default function LandingPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoaded && isSignedIn) navigate('/home', { replace: true })
  }, [isLoaded, isSignedIn, navigate])

  if (!isLoaded) {
    return <div className="flex min-h-screen items-center justify-center bg-background" aria-busy="true" />
  }

  return (
    <>
      <Seo {...seo} path="/" />
      <div
        data-testid="regionalism-login"
        className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16 text-center"
      >
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <MapPin className="h-7 w-7" aria-hidden />
      </div>
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Regional words</p>
      <h1 className="max-w-xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        Log in to {APP_NAME}
      </h1>
      <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
        Discover and pin regional English words and phrases on the world map.
      </p>

      {isSignedIn ? (
        <Link
          to="/home"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Enter the map
        </Link>
      ) : (
        <Button className="mt-8 h-11 px-6" onClick={() => setShowAuthModal(true)}>
          Log in
        </Button>
      )}

        {showAuthModal && (
          <AuthOverlay
            onClose={() => setShowAuthModal(false)}
            providers={['github', 'google']}
            title="Log in to Region-ism"
            description="Discover and pin regional words"
          />
        )}
      </div>
    </>
  )
}
