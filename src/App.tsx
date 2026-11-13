import type { ReactElement } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { Role } from '@/types'
import { useAuthStore } from '@/store/auth'
import { roleHome } from '@/utils'

import { RoleSelectPage } from '@/pages/RoleSelect'
import { BuyerLayout } from '@/layouts/BuyerLayout'
import { ShopLayout } from '@/layouts/ShopLayout'
import { RiderLayout } from '@/layouts/RiderLayout'
import { AdminLayout } from '@/layouts/AdminLayout'

import {
  AddressSetupPage,
  BuyerWelcomePage,
  LocationSetupPage,
  LoginPage,
  OtpPage,
  ProfileSetupPage,
} from '@/pages/buyer/Onboarding'
import { BuyerHomePage } from '@/pages/buyer/Home'
import { BuyerSearchPage } from '@/pages/buyer/Search'
import { BuyerCategoriesPage } from '@/pages/buyer/Categories'
import { ProductDetailPage } from '@/pages/buyer/ProductDetail'
import { BuyerShopsPage } from '@/pages/buyer/Shops'
import { ShopDetailPage } from '@/pages/buyer/ShopDetail'
import { ComparePage } from '@/pages/buyer/Compare'
import { CartPage } from '@/pages/buyer/Cart'
import { CheckoutPage } from '@/pages/buyer/Checkout'
import { BuyerOrdersPage } from '@/pages/buyer/Orders'
import { BuyerOrderDetailPage } from '@/pages/buyer/OrderDetail'
import { AiAssistantPage } from '@/pages/buyer/AiAssistant'
import { BuyerAccountPage } from '@/pages/buyer/Account'

import { ShopOverviewPage } from '@/pages/shop/Overview'
import { ShopOrdersPage } from '@/pages/shop/Orders'
import { ShopProductsPage } from '@/pages/shop/Products'
import { ShopInventoryPage } from '@/pages/shop/Inventory'
import { ShopSalesPage } from '@/pages/shop/Sales'
import { ShopDealsPage } from '@/pages/shop/Deals'
import { ShopProfilePage } from '@/pages/shop/Profile'
import { ShopOnboardingPage } from '@/pages/shop/Onboarding'
import { ShopLoginPage } from '@/pages/shop/Login'

import { RiderHomePage } from '@/pages/rider/Home'
import { RiderJobsPage } from '@/pages/rider/Jobs'
import { RiderActivePage } from '@/pages/rider/Active'
import { RiderJobDetailPage } from '@/pages/rider/JobDetail'
import { RiderCodPage } from '@/pages/rider/Cod'
import { RiderEarningsPage } from '@/pages/rider/Earnings'
import { RiderProfilePage } from '@/pages/rider/Profile'
import { RiderRegisterPage } from '@/pages/rider/Register'
import { RiderLoginPage } from '@/pages/rider/Login'

import { AdminOverviewPage } from '@/pages/admin/Overview'
import { AdminShopsPage } from '@/pages/admin/Shops'
import { AdminRidersPage } from '@/pages/admin/Riders'
import { AdminOrdersPage } from '@/pages/admin/Orders'
import { AdminDeliveriesPage } from '@/pages/admin/Deliveries'
import { AdminFeesPage } from '@/pages/admin/Fees'
import { AdminSettlementsPage } from '@/pages/admin/Settlements'
import { AdminReportsPage } from '@/pages/admin/Reports'
import { AdminActivityPage } from '@/pages/admin/Activity'
import { AdminSettingsPage } from '@/pages/admin/Settings'
import { AdminLoginPage } from '@/pages/admin/Login'

function RequireRole({ role, children }: { role: Role; children: ReactElement }) {
  const current = useAuthStore((s) => s.role)
  if (!current) return <Navigate to="/" replace />
  if (current !== role) return <Navigate to={roleHome[current]} replace />
  return children
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RoleSelectPage />} />

        {/* Buyer onboarding */}
        <Route path="/buyer/welcome" element={<BuyerWelcomePage />} />
        <Route path="/buyer/login" element={<LoginPage />} />
        <Route path="/buyer/otp" element={<OtpPage />} />
        <Route path="/buyer/profile-setup" element={<ProfileSetupPage />} />
        <Route path="/buyer/location-setup" element={<LocationSetupPage />} />
        <Route path="/buyer/address-setup" element={<AddressSetupPage />} />

        {/* Buyer app */}
        <Route
          path="/buyer"
          element={
            <RequireRole role="buyer">
              <BuyerLayout />
            </RequireRole>
          }
        >
          <Route index element={<BuyerHomePage />} />
          <Route path="search" element={<BuyerSearchPage />} />
          <Route path="categories" element={<BuyerCategoriesPage />} />
          <Route path="products/:productId" element={<ProductDetailPage />} />
          <Route path="shops" element={<BuyerShopsPage />} />
          <Route path="shops/:shopId" element={<ShopDetailPage />} />
          <Route path="compare" element={<ComparePage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="orders" element={<BuyerOrdersPage />} />
          <Route path="orders/:orderId" element={<BuyerOrderDetailPage />} />
          <Route path="ai" element={<AiAssistantPage />} />
          <Route path="account" element={<BuyerAccountPage />} />
          <Route path="account/:section" element={<BuyerAccountPage />} />
        </Route>

        {/* Shopkeeper */}
        <Route path="/shop/login" element={<ShopLoginPage />} />
        <Route
          path="/shop"
          element={
            <RequireRole role="shopkeeper">
              <ShopLayout />
            </RequireRole>
          }
        >
          <Route index element={<ShopOverviewPage />} />
          <Route path="orders" element={<ShopOrdersPage />} />
          <Route path="products" element={<ShopProductsPage />} />
          <Route path="inventory" element={<ShopInventoryPage />} />
          <Route path="sales" element={<ShopSalesPage />} />
          <Route path="deals" element={<ShopDealsPage />} />
          <Route path="profile" element={<ShopProfilePage />} />
          <Route path="onboarding" element={<ShopOnboardingPage />} />
        </Route>

        {/* Rider */}
        <Route path="/rider/login" element={<RiderLoginPage />} />
        <Route
          path="/rider"
          element={
            <RequireRole role="rider">
              <RiderLayout />
            </RequireRole>
          }
        >
          <Route index element={<RiderHomePage />} />
          <Route path="jobs" element={<RiderJobsPage />} />
          <Route path="active" element={<RiderActivePage />} />
          <Route path="active/:jobId" element={<RiderJobDetailPage />} />
          <Route path="cod" element={<RiderCodPage />} />
          <Route path="earnings" element={<RiderEarningsPage />} />
          <Route path="profile" element={<RiderProfilePage />} />
          <Route path="register" element={<RiderRegisterPage />} />
        </Route>

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={
            <RequireRole role="admin">
              <AdminLayout />
            </RequireRole>
          }
        >
          <Route index element={<AdminOverviewPage />} />
          <Route path="shops" element={<AdminShopsPage />} />
          <Route path="riders" element={<AdminRidersPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="deliveries" element={<AdminDeliveriesPage />} />
          <Route path="fees" element={<AdminFeesPage />} />
          <Route path="settlements" element={<AdminSettlementsPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="activity" element={<AdminActivityPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
