import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Bike,
  CheckCircle2,
  FileText,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
} from 'lucide-react'
import { registerRider } from '@/services/workflow'
import { Button, Card, Input, PageHeader } from '@/components/ui/primitives'
import { DemoNote } from '@/components/shared/dashboard'
import type { VehicleType } from '@/types'

export function RiderRegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [vehicle, setVehicle] = useState<VehicleType>('bike')
  const [city, setCity] = useState('Gyanpur')
  const [district, setDistrict] = useState('Bhadohi')
  const [pincode, setPincode] = useState('221304')
  const [serviceArea, setServiceArea] = useState('Gyanpur Market & Surrounds')
  const [idDocName, setIdDocName] = useState('Aadhaar Card')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return

    registerRider({
      name: name.trim(),
      phone: phone.trim(),
      vehicle,
      city,
      district,
      pincode,
      serviceArea,
      idDocName,
    })

    navigate('/rider')
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-2">
        <Link to="/rider" className="rounded-lg p-1.5 text-brown-500 hover:bg-cream-2">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-lg font-bold text-brown-900">Become a Delivery Partner</h1>
          <p className="text-xs text-brown-500">Deliver for local shops in your town & earn daily.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="p-4 space-y-3.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-brown-500">
            Personal Details
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
            label="Mobile Number"
            placeholder="10-digit phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            leftIcon={Phone}
          />
        </Card>

        <Card className="p-4 space-y-3.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-brown-500">
            Vehicle & Service Zone
          </h2>

          <div>
            <label className="block text-xs font-bold text-brown-700 mb-1">Vehicle Owned</label>
            <select
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value as VehicleType)}
              className="w-full rounded-xl border border-cream-4 bg-white px-3 py-2.5 text-xs text-brown-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="bike">Motorcycle (100cc-150cc)</option>
              <option value="scooter">Scooter / Scooty</option>
              <option value="cycle">Bicycle</option>
              <option value="auto">E-Rickshaw / Auto</option>
            </select>
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

        <Card className="p-4 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-brown-500">
            KYC Verification Document
          </h2>

          <div>
            <label className="block text-xs font-bold text-brown-700 mb-1">Document Type</label>
            <select
              value={idDocName}
              onChange={(e) => setIdDocName(e.target.value)}
              className="w-full rounded-xl border border-cream-4 bg-white px-3 py-2.5 text-xs text-brown-900"
            >
              <option value="Aadhaar Card">Aadhaar Card (Front & Back)</option>
              <option value="Driving License">Driving License</option>
              <option value="Voter ID Card">Voter ID Card</option>
              <option value="PAN Card">PAN Card</option>
            </select>
          </div>

          <div className="rounded-xl border border-dashed border-cream-4 bg-cream-2/50 p-4 text-center">
            <Upload className="mx-auto h-6 w-6 text-orange-500" />
            <p className="mt-1 text-xs font-semibold text-brown-800">Demo Document Auto-Attached</p>
            <p className="text-[10px] text-brown-400">
              In this preview, verification is simulated instantly by platform admin.
            </p>
          </div>
        </Card>

        <Button
          type="submit"
          size="lg"
          variant="primary"
          className="w-full"
          leftIcon={CheckCircle2}
        >
          Submit Partner Application
        </Button>
      </form>

      <DemoNote>Super Admin can approve or review this application in Admin &gt; Delivery Partners.</DemoNote>
    </div>
  )
}
