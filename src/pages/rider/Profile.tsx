import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bike,
  CheckCircle2,
  FileText,
  MapPin,
  Phone,
  Power,
  RotateCcw,
  ShieldCheck,
  Star,
  User,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useDeliveryStore } from '@/store/delivery'
import { toast } from '@/store/toast'
import { Avatar, Badge, Button, Card, Modal, PageHeader, Select } from '@/components/ui/primitives'
import { DemoNote } from '@/components/shared/dashboard'
import type { VehicleType } from '@/types'

export function RiderProfilePage() {
  const navigate = useNavigate()
  const riderId = useAuthStore((s) => s.riderId)
  const signOut = useAuthStore((s) => s.signOut)
  const setRiderId = useAuthStore((s) => s.setRiderId)
  const riders = useDeliveryStore((s) => s.riders)
  const updateRider = useDeliveryStore((s) => s.updateRider)

  const rider = riders.find((r) => r.id === riderId) ?? riders[0]

  const [editing, setEditing] = useState(false)
  const [vehicle, setVehicle] = useState<VehicleType>(rider?.vehicle ?? 'bike')
  const [phone, setPhone] = useState(rider?.phone ?? '')

  if (!rider) return null

  const handleSave = () => {
    updateRider(rider.id, { vehicle, phone })
    setEditing(false)
    toast('Profile updated', 'Your vehicle and contact info have been saved.', 'success')
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title="Rider Profile"
        subtitle="Manage your identity, vehicle, and working zones."
      />

      {/* Header Profile Card */}
      <Card className="p-4 flex items-center gap-3">
        <Avatar name={rider.name} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-base font-bold text-brown-900 truncate">
              {rider.name}
            </h2>
            <Badge tone={rider.status === 'approved' ? 'success' : 'warning'}>
              {rider.status}
            </Badge>
          </div>
          <p className="text-xs text-brown-500">{rider.phone}</p>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-brown-600">
            <span className="flex items-center gap-1 font-semibold text-warning-dark">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              {rider.rating || '4.8'}
            </span>
            <span>·</span>
            <span>{rider.totalDeliveries || 48} deliveries</span>
          </div>
        </div>
      </Card>

      {/* Vehicle and Operational Details */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brown-500">
            Delivery Fleet Details
          </h3>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            Edit Details
          </Button>
        </div>

        <div className="divide-y divide-cream-3 text-xs">
          <div className="flex justify-between py-2">
            <span className="text-brown-500">Vehicle Type</span>
            <span className="font-semibold text-brown-900 capitalize flex items-center gap-1">
              <Bike className="h-3.5 w-3.5 text-orange-500" /> {rider.vehicle}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-brown-500">Primary Hub / Service Area</span>
            <span className="font-semibold text-brown-900">{rider.serviceArea}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-brown-500">Town & District</span>
            <span className="font-semibold text-brown-900">
              {rider.city}, {rider.district}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-brown-500">PIN Code</span>
            <span className="font-semibold text-brown-900">{rider.pincode}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-brown-500">Identity Document</span>
            <span className="font-semibold text-success flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> {rider.idDocName || 'Aadhaar Card Verified'}
            </span>
          </div>
        </div>
      </Card>

      {/* Switch Demo Rider Persona */}
      <Card className="p-4 space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-brown-500">
          Switch Demo Rider Profile
        </h3>
        <p className="text-[11px] text-brown-400">
          Select another pre-seeded rider persona across our pilot towns.
        </p>

        <div className="space-y-1.5 pt-1">
          {riders.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                setRiderId(r.id)
                toast('Rider switched', `Now viewing as ${r.name}`, 'info')
              }}
              className={`flex w-full items-center justify-between rounded-xl border p-2.5 text-left text-xs transition-colors ${
                r.id === rider.id
                  ? 'border-orange-500 bg-orange-50/50 text-orange-950 font-semibold'
                  : 'border-cream-3 bg-white text-brown-700 hover:bg-cream-2'
              }`}
            >
              <div>
                <p>{r.name}</p>
                <p className="text-[10px] text-brown-400">{r.serviceArea} · {r.vehicle}</p>
              </div>
              <Badge tone={r.status === 'approved' ? 'success' : 'warning'}>
                {r.status}
              </Badge>
            </button>
          ))}
        </div>
      </Card>

      <div className="pt-2">
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => {
            signOut()
            navigate('/')
          }}
          leftIcon={Power}
        >
          Exit to Persona Selector
        </Button>
      </div>

      {/* Edit Modal */}
      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit Rider Details"
        description="Update your vehicle type or contact number."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-brown-700 mb-1">Vehicle Type</label>
            <select
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value as VehicleType)}
              className="w-full rounded-xl border border-cream-4 bg-white px-3 py-2 text-xs"
            >
              <option value="bike">Motorcycle / Bike</option>
              <option value="scooter">Scooter</option>
              <option value="cycle">Bicycle</option>
              <option value="auto">Auto / E-Rickshaw</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-brown-700 mb-1">Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-cream-4 bg-white px-3 py-2 text-xs"
            />
          </div>
        </div>
      </Modal>

      <DemoNote>Rider ratings and shift records are preserved in local storage.</DemoNote>
    </div>
  )
}
