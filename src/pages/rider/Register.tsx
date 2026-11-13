import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Bike,
  CheckCircle2,
  Clock,
  GraduationCap,
  KeyRound,
  MapPin,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
} from 'lucide-react'
import { registerStudentDeliveryPartner, requestPhoneOtp, verifyPhoneOtp } from '@/services/supabaseService'
import { Badge, Button, Card, Input, PageHeader } from '@/components/ui/primitives'
import { DemoNote, InfoBanner } from '@/components/shared/dashboard'
import { toast } from '@/store/toast'
import type { VehicleType } from '@/types'

export function RiderRegisterPage() {
  const navigate = useNavigate()

  // Form states
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [collegeName, setCollegeName] = useState('K.N. Govt. PG College, Gyanpur')
  const [vehicle, setVehicle] = useState<VehicleType>('bike')
  const [city, setCity] = useState('Gyanpur')
  const [district, setDistrict] = useState('Bhadohi')
  const [pincode, setPincode] = useState('221304')
  const [serviceArea, setServiceArea] = useState('Gyanpur Market & Surrounds')
  const [availabilityHours, setAvailabilityHours] = useState('Evening (4:00 PM – 9:00 PM)')
  const [studentIdFile, setStudentIdFile] = useState<File | null>(null)
  const [studentIdFileName, setStudentIdFileName] = useState('college_id_card.pdf')

  // OTP Verification state
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpVerified, setOtpVerified] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSendOtp = async () => {
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      toast('Valid phone required', 'Please enter a 10-digit mobile number.', 'warning')
      return
    }
    setSendingOtp(true)
    const result = await requestPhoneOtp(phone)
    setSendingOtp(false)
    if (result.ok) {
      setOtpSent(true)
      if (result.mockCode) setOtpCode(result.mockCode)
      toast('OTP Sent', result.message, 'info')
    }
  }

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) return
    setVerifyingOtp(true)
    const result = await verifyPhoneOtp(phone, otpCode, 'rider')
    setVerifyingOtp(false)
    if (result.ok) {
      setOtpVerified(true)
      toast('Phone verified', 'Phone number authenticated successfully.', 'success')
    } else {
      toast('Verification failed', result.error ?? 'Invalid OTP', 'error')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setStudentIdFile(file)
      setStudentIdFileName(file.name)
      toast('Student ID Attached', file.name, 'success')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim() || !collegeName.trim()) {
      toast('Missing details', 'Please fill all required student profile fields.', 'warning')
      return
    }
    if (!otpVerified) {
      toast('Phone verification required', 'Please verify your phone OTP before submitting.', 'warning')
      return
    }

    setSubmitting(true)
    const result = await registerStudentDeliveryPartner({
      name: name.trim(),
      phone: phone.trim(),
      collegeName: collegeName.trim(),
      studentIdFile: studentIdFile ?? studentIdFileName,
      vehicle,
      city: city.trim(),
      district: district.trim(),
      pincode: pincode.trim(),
      serviceArea: serviceArea.trim(),
      availabilityHours,
    })
    setSubmitting(false)

    if (result.ok) {
      navigate('/rider')
    }
  }

  return (
    <div className="space-y-4 pb-12">
      <div className="flex items-center gap-2">
        <Link to="/rider" className="rounded-lg p-1.5 text-brown-500 hover:bg-cream-2">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-lg font-bold text-brown-900">Student Delivery Partner Onboarding</h1>
          <p className="text-xs text-brown-500">Flexible earnings around your college lecture schedule.</p>
        </div>
      </div>

      <InfoBanner tone="info" title="Student Delivery Protocol">
        LocalizeIt delivery is reserved for local students. Accounts remain in <strong>Pending</strong> state until the Hub Super Admin reviews your college ID.
      </InfoBanner>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Personal & College Details */}
        <Card className="p-4 space-y-3.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-brown-500 flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4 text-orange-500" /> Student Profile
          </h2>

          <Input
            label="Full Name"
            placeholder="e.g. Ramesh Kumar"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            leftIcon={User}
          />

          <Input
            label="College / University Name"
            placeholder="e.g. K.N. Govt PG College, Gyanpur"
            value={collegeName}
            onChange={(e) => setCollegeName(e.target.value)}
            required
            leftIcon={GraduationCap}
          />

          {/* Phone & OTP Verification */}
          <div>
            <label className="block text-xs font-bold text-brown-700 mb-1">Mobile Phone (OTP Verified)</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value)
                    setOtpVerified(false)
                  }}
                  required
                  disabled={otpVerified}
                  leftIcon={Phone}
                />
              </div>
              {!otpVerified ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={handleSendOtp}
                  loading={sendingOtp}
                >
                  {otpSent ? 'Resend' : 'Send OTP'}
                </Button>
              ) : (
                <Badge tone="success" className="px-3 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                </Badge>
              )}
            </div>
          </div>

          {otpSent && !otpVerified && (
            <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-3 space-y-2">
              <p className="text-[11px] font-semibold text-brown-800">
                Enter the 6-digit verification code sent to {phone}:
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter OTP (123456)"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  leftIcon={KeyRound}
                />
                <Button
                  type="button"
                  size="md"
                  variant="primary"
                  onClick={handleVerifyOtp}
                  loading={verifyingOtp}
                >
                  Verify
                </Button>
              </div>
              <p className="text-[10px] text-brown-400">Demo test code: 123456</p>
            </div>
          )}
        </Card>

        {/* Vehicle & Operational Schedule */}
        <Card className="p-4 space-y-3.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-brown-500 flex items-center gap-1.5">
            <Bike className="h-4 w-4 text-orange-500" /> Delivery Vehicle & Schedule
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-brown-700 mb-1">Vehicle Type</label>
              <select
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value as VehicleType)}
                className="w-full rounded-xl border border-cream-4 bg-white px-3 py-2.5 text-xs text-brown-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="bike">Motorcycle (100cc-150cc)</option>
                <option value="scooter">Scooter / Scooty</option>
                <option value="cycle">Bicycle / Electric Cycle</option>
                <option value="auto">E-Rickshaw / Auto</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-brown-700 mb-1">Class-Friendly Availability</label>
              <select
                value={availabilityHours}
                onChange={(e) => setAvailabilityHours(e.target.value)}
                className="w-full rounded-xl border border-cream-4 bg-white px-3 py-2.5 text-xs text-brown-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="Evening (4:00 PM – 9:00 PM)">Evening (4:00 PM – 9:00 PM)</option>
                <option value="Morning (7:00 AM – 11:30 AM)">Morning (7:00 AM – 11:30 AM)</option>
                <option value="Afternoon (1:00 PM – 5:00 PM)">Afternoon (1:00 PM – 5:00 PM)</option>
                <option value="Weekends Full Day">Weekends Full Day</option>
                <option value="Flexible / On-Demand">Flexible / On-Demand</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Town / City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
            <Input
              label="District"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input
              label="PIN Code"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              required
            />
            <Input
              label="Service Hub Area"
              value={serviceArea}
              onChange={(e) => setServiceArea(e.target.value)}
              required
            />
          </div>
        </Card>

        {/* Student ID Card Upload (Private Storage) */}
        <Card className="p-4 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-brown-500 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-orange-500" /> College Identity Verification
          </h2>

          <div className="rounded-xl border border-dashed border-cream-4 bg-cream-2/50 p-4 text-center space-y-2">
            <Upload className="mx-auto h-7 w-7 text-orange-500" />
            <div>
              <p className="text-xs font-semibold text-brown-900">{studentIdFileName}</p>
              <p className="text-[10px] text-brown-400">
                Uploaded document stored securely in private Supabase Storage for Admin approval.
              </p>
            </div>
            <label className="inline-block cursor-pointer">
              <span className="rounded-lg border border-cream-4 bg-white px-3 py-1.5 text-xs font-medium text-brown-700 shadow-xs hover:border-orange-300">
                Choose Student ID File
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </Card>

        <Button
          type="submit"
          size="lg"
          variant="primary"
          className="w-full"
          loading={submitting}
          leftIcon={CheckCircle2}
        >
          Submit Student Partner Application
        </Button>
      </form>

      <DemoNote>Super Admin approves student applications in the Admin Console before riders can receive tasks.</DemoNote>
    </div>
  )
}
