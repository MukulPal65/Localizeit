import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, LockKeyhole, Store } from 'lucide-react'
import { Badge, Button, Card, Field, Input } from '@/components/ui/primitives'
import { Logo } from '@/components/ui/images'
import { useAuthStore } from '@/store/auth'
import { toast } from '@/store/toast'

const DEMO_SHOP_ID = 'a1000000-0000-4000-8000-000000000001'
const DEMO_SHOP_EMAIL = 'shop@localizeit.test'
const DEMO_SHOP_PASSWORD = 'Shop@1234'

export function ShopLoginPage() {
  const navigate = useNavigate()
  const startSession = useAuthStore((state) => state.startSession)
  const [email, setEmail] = useState(DEMO_SHOP_EMAIL)
  const [password, setPassword] = useState(DEMO_SHOP_PASSWORD)
  const [error, setError] = useState('')

  const submit = () => {
    if (email.trim().toLowerCase() !== DEMO_SHOP_EMAIL || password !== DEMO_SHOP_PASSWORD) {
      setError('Use the demo shop credentials shown below.')
      return
    }
    setError('')
    startSession('shopkeeper', DEMO_SHOP_ID)
    toast('Shop login successful', 'Welcome to the shop dashboard.', 'success')
    navigate('/shop')
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-md">
        <Link to="/" className="inline-flex">
          <Logo />
        </Link>
        <Card className="mt-8 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <Store className="h-5 w-5" />
            </span>
            <Badge tone="neutral">Demo login</Badge>
          </div>
          <h1 className="mt-4 font-heading text-2xl font-semibold text-brown-900">Shopkeeper login</h1>
          <p className="mt-1 text-xs leading-relaxed text-brown-400">
            Sign in to manage products, orders, stock, deals and payouts.
          </p>

          <div className="mt-5 space-y-4">
            <Field label="Shop email" required error={error}>
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
              Log in to shop
            </Button>
          </div>

          <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 p-3 text-[11px] leading-relaxed text-orange-800">
            <p className="font-semibold">Demo credentials</p>
            <p className="mt-1">ID: {DEMO_SHOP_EMAIL}</p>
            <p>Password: {DEMO_SHOP_PASSWORD}</p>
          </div>

          <p className="mt-4 text-center text-[11px] text-brown-400">
            New shop?{' '}
            <Link to="/shop/onboarding" className="font-semibold text-orange-600 hover:text-orange-700">
              Register for admin approval
            </Link>
          </p>
        </Card>
      </div>
    </main>
  )
}
