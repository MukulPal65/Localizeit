import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Badge, Button, Card, Input } from '@/components/ui/primitives'
import { Logo } from '@/components/ui/images'
import { useAuthStore } from '@/store/auth'
import { toast } from '@/store/toast'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const startSession = useAuthStore((state) => state.startSession)
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')

  const submit = () => {
    if (passcode !== '1234') {
      setError('Incorrect demo passcode.')
      return
    }
    startSession('admin', 'admin-demo')
    toast('Admin login successful', 'Welcome to the platform console.', 'success')
    navigate('/admin')
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-md">
        <Link to="/" className="inline-flex"><Logo /></Link>
        <Card className="mt-8 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-info-soft text-info">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <Badge tone="neutral">Demo access</Badge>
          </div>
          <h1 className="mt-4 font-heading text-2xl font-semibold text-brown-900">Admin passcode</h1>
          <p className="mt-1 text-xs text-brown-400">Enter the demo passcode to open the admin console.</p>
          <div className="mt-5 space-y-4">
            <Input
              label="Passcode"
              type="password"
              value={passcode}
              error={error}
              leftIcon={LockKeyhole}
              onChange={(event) => {
                setPasscode(event.target.value)
                setError('')
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submit()
              }}
            />
            <Button className="w-full" rightIcon={ArrowRight} onClick={submit}>Open admin console</Button>
          </div>
          <p className="mt-4 rounded-xl bg-info-soft p-3 text-center text-[11px] text-brown-700">
            Demo passcode: <strong>1234</strong>
          </p>
        </Card>
      </div>
    </main>
  )
}
