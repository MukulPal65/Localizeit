import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Bike, LockKeyhole } from 'lucide-react'
import { Badge, Button, Card, Field, Input } from '@/components/ui/primitives'
import { Logo } from '@/components/ui/images'
import { useAuthStore } from '@/store/auth'
import { toast } from '@/store/toast'

const DEMO_RIDER_ID = 'b1000000-0000-4000-8000-000000000001'
const DEMO_RIDER_EMAIL = 'rider@localizeit.test'
const DEMO_RIDER_PASSWORD = 'Rider@1234'

export function RiderLoginPage() {
  const navigate = useNavigate()
  const startSession = useAuthStore((state) => state.startSession)
  const [email, setEmail] = useState(DEMO_RIDER_EMAIL)
  const [password, setPassword] = useState(DEMO_RIDER_PASSWORD)
  const [error, setError] = useState('')

  const submit = () => {
    if (email.trim().toLowerCase() !== DEMO_RIDER_EMAIL || password !== DEMO_RIDER_PASSWORD) {
      setError('Use the demo delivery partner credentials shown below.')
      return
    }
    setError('')
    startSession('rider', DEMO_RIDER_ID)
    toast('Rider login successful', 'Welcome to the delivery partner app.', 'success')
    navigate('/rider')
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-md">
        <Link to="/" className="inline-flex">
          <Logo />
        </Link>
        <Card className="mt-8 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-success-soft text-success">
              <Bike className="h-5 w-5" />
            </span>
            <Badge tone="neutral">Demo login</Badge>
          </div>
          <h1 className="mt-4 font-heading text-2xl font-semibold text-brown-900">Delivery partner login</h1>
          <p className="mt-1 text-xs leading-relaxed text-brown-400">
            Accept nearby jobs, update delivery status and track your earnings.
          </p>

          <div className="mt-5 space-y-4">
            <Field label="Partner email" required error={error}>
              <Input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setError('')
                }}
                autoComplete="username"
              />
            </Field>
            <Input
              label="Password"
              required
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setError('')
              }}
              autoComplete="current-password"
              leftIcon={LockKeyhole}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submit()
              }}
            />
            <Button className="w-full" rightIcon={ArrowRight} onClick={submit}>
              Log in to rider app
            </Button>
          </div>

          <div className="mt-5 rounded-xl border border-success/20 bg-success-soft p-3 text-[11px] leading-relaxed text-brown-700">
            <p className="font-semibold">Demo credentials</p>
            <p className="mt-1">ID: {DEMO_RIDER_EMAIL}</p>
            <p>Password: {DEMO_RIDER_PASSWORD}</p>
          </div>

          <p className="mt-4 text-center text-[11px] text-brown-400">
            New delivery partner?{' '}
            <Link to="/rider/register" className="font-semibold text-orange-600 hover:text-orange-700">
              Register for admin approval
            </Link>
          </p>
        </Card>
      </div>
    </main>
  )
}
