import { useState } from 'react'
import {
  BarChart2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileBarChart2,
  FileSpreadsheet,
  FileText,
  IndianRupee,
  Layers,
  MapPin,
  Share2,
  ShoppingBag,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react'
import { Badge, Button, Card, PageHeader } from '@/components/ui/primitives'
import { BarChart } from '@/components/ui/charts'
import { DemoNote } from '@/components/shared/dashboard'
import { toast } from '@/store/toast'
import { categorySplit, areaPerformance } from '@/data/admin'

export function AdminReportsPage() {
  const [downloading, setDownloading] = useState<string | null>(null)

  const handleExport = (reportName: string) => {
    setDownloading(reportName)
    setTimeout(() => {
      setDownloading(null)
      toast(
        'Report Exported',
        `${reportName}.csv has been generated and saved locally for demo review.`,
        'success',
      )
    }, 600)
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Reports & Ecosystem Insights"
        subtitle="Operational metrics, category demand trends, and downloadable CSV statements for district hubs."
      />

      {/* Operational Highlights Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="p-4 bg-white">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brown-400">Avg Delivery SLA</p>
          <p className="font-heading text-2xl font-bold text-brown-900 mt-1">36 mins</p>
          <p className="text-[10px] text-success mt-0.5 font-medium">Within 45m target</p>
        </Card>

        <Card className="p-4 bg-white">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brown-400">COD Share</p>
          <p className="font-heading text-2xl font-bold text-warning mt-1">44.8%</p>
          <p className="text-[10px] text-brown-400 mt-0.5">55.2% digital UPI</p>
        </Card>

        <Card className="p-4 bg-white">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brown-400">Multi-Shop Carts</p>
          <p className="font-heading text-2xl font-bold text-orange-600 mt-1">32.4%</p>
          <p className="text-[10px] text-brown-400 mt-0.5">Orders bundled from ≥2 stores</p>
        </Card>

        <Card className="p-4 bg-white">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brown-400">Return Rate</p>
          <p className="font-heading text-2xl font-bold text-success mt-1">0.8%</p>
          <p className="text-[10px] text-brown-400 mt-0.5">Low rejection incidence</p>
        </Card>
      </div>

      {/* Category demand distribution */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-sm font-bold text-brown-900">
              Volume by Product Category (%)
            </h3>
            <p className="text-[11px] text-brown-400">
              Relative sales contribution across consumer goods and regional specialties
            </p>
          </div>
          <Badge tone="orange">Pilot Aggregate</Badge>
        </div>
        <BarChart data={categorySplit} format={(v) => `${v}%`} height={160} />
      </Card>

      {/* Downloadable Reports Matrix */}
      <div className="space-y-3">
        <h3 className="font-heading text-sm font-bold text-brown-900">
          Standard Financial & Audit Downloads
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <Card className="p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-orange-600">
                <FileSpreadsheet className="h-5 w-5" />
                <h4 className="font-heading text-xs font-bold text-brown-900">
                  Monthly GMV & Tax Reconciliation
                </h4>
              </div>
              <p className="mt-1.5 text-xs text-brown-500">
                Full ledger of itemized multi-shop orders, commission deductions, and GST totals.
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="w-full"
              disabled={downloading === 'GMV_Report'}
              onClick={() => handleExport('GMV_Report')}
              leftIcon={Download}
            >
              {downloading === 'GMV_Report' ? 'Exporting...' : 'Export CSV (34 KB)'}
            </Button>
          </Card>

          <Card className="p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-info">
                <FileText className="h-5 w-5" />
                <h4 className="font-heading text-xs font-bold text-brown-900">
                  Merchant Performance Ledger
                </h4>
              </div>
              <p className="mt-1.5 text-xs text-brown-500">
                Store fulfillment SLAs, stock availability rates, customer ratings, and order cancellations.
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="w-full"
              disabled={downloading === 'Merchant_Report'}
              onClick={() => handleExport('Merchant_Report')}
              leftIcon={Download}
            >
              {downloading === 'Merchant_Report' ? 'Exporting...' : 'Export CSV (28 KB)'}
            </Button>
          </Card>

          <Card className="p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-success">
                <Truck className="h-5 w-5" />
                <h4 className="font-heading text-xs font-bold text-brown-900">
                  Fleet & COD Reconciliation
                </h4>
              </div>
              <p className="mt-1.5 text-xs text-brown-500">
                Rider trip earnings, distance claims, cash collections, and town hub deposit signatures.
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="w-full"
              disabled={downloading === 'Fleet_COD_Report'}
              onClick={() => handleExport('Fleet_COD_Report')}
              leftIcon={Download}
            >
              {downloading === 'Fleet_COD_Report' ? 'Exporting...' : 'Export CSV (19 KB)'}
            </Button>
          </Card>
        </div>
      </div>

      <DemoNote>Generated reports conform to district pilot commerce formats.</DemoNote>
    </div>
  )
}
