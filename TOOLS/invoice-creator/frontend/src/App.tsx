import { useState } from 'react'
import { Button } from '@/components/ui/button'
import CompanyConfig from '@/components/CompanyConfig'
import ClientManagement from '@/components/ClientManagement'
import InvoiceGenerator from '@/components/InvoiceGenerator'
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  FileText, 
  Settings,
  DollarSign,
  Clock3,
  CheckCircle
} from 'lucide-react'

type Page = 'dashboard' | 'settings' | 'clients' | 'invoices'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')

  const renderPage = () => {
    switch (currentPage) {
      case 'settings':
        return <CompanyConfig />
      case 'clients':
        return <ClientManagement />
      case 'invoices':
        return <InvoiceGenerator />
      default:
        return (
          <div style={{ padding: '32px' }}>
            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
              {/* Total Revenue Card */}
              <div style={{ 
                backgroundColor: 'white', 
                padding: '24px', 
                borderRadius: '12px', 
                border: '1px solid #e5e7eb', 
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>Total Revenue</p>
                    <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>$45,670</p>
                    <p style={{ fontSize: '12px', color: '#10b981' }}>📈 +12.5% from last month</p>
                  </div>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    backgroundColor: '#dcfce7', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <DollarSign style={{ width: '24px', height: '24px', color: '#10b981' }} />
                  </div>
                </div>
              </div>

              {/* Active Clients Card */}
              <div style={{ 
                backgroundColor: 'white', 
                padding: '24px', 
                borderRadius: '12px', 
                border: '1px solid #e5e7eb', 
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>Active Clients</p>
                    <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>12</p>
                    <p style={{ fontSize: '12px', color: '#3b82f6' }}>👤 +2 new this month</p>
                  </div>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    backgroundColor: '#dbeafe', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <Users style={{ width: '24px', height: '24px', color: '#3b82f6' }} />
                  </div>
                </div>
              </div>

              {/* Pending Invoices Card */}
              <div style={{ 
                backgroundColor: 'white', 
                padding: '24px', 
                borderRadius: '12px', 
                border: '1px solid #e5e7eb', 
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>Pending Invoices</p>
                    <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>3</p>
                    <p style={{ fontSize: '12px', color: '#f59e0b' }}>📄 Awaiting payment</p>
                  </div>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    backgroundColor: '#fed7aa', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <Clock3 style={{ width: '24px', height: '24px', color: '#f59e0b' }} />
                  </div>
                </div>
              </div>

              {/* Paid Invoices Card */}
              <div style={{ 
                backgroundColor: 'white', 
                padding: '24px', 
                borderRadius: '12px', 
                border: '1px solid #e5e7eb', 
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>Paid Invoices</p>
                    <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>28</p>
                    <p style={{ fontSize: '12px', color: '#10b981' }}>✅ This month</p>
                  </div>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    backgroundColor: '#dcfce7', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <CheckCircle style={{ width: '24px', height: '24px', color: '#10b981' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Invoices */}
            <div style={{ 
              backgroundColor: 'white', 
              padding: '24px', 
              borderRadius: '12px', 
              border: '1px solid #e5e7eb', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>Recent Invoices</h2>
                <button style={{ color: '#3b82f6', fontSize: '14px', fontWeight: '500' }}>View All</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Invoice 1 */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '16px', 
                  borderRadius: '8px',
                  transition: 'background-color 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      backgroundColor: '#3b82f6', 
                      borderRadius: '8px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <FileText style={{ width: '24px', height: '24px', color: 'white' }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 'bold', color: '#111827' }}>INV-001</p>
                      <p style={{ fontSize: '14px', color: '#6b7280' }}>Acme Corp</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>$2500</p>
                    <span style={{ 
                      display: 'inline-block',
                      padding: '2px 12px', 
                      borderRadius: '9999px', 
                      fontSize: '12px', 
                      fontWeight: '500', 
                      backgroundColor: '#dcfce7', 
                      color: '#166534' 
                    }}>paid</span>
                  </div>
                </div>

                {/* Invoice 2 */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '16px', 
                  borderRadius: '8px',
                  transition: 'background-color 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      backgroundColor: '#3b82f6', 
                      borderRadius: '8px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <FileText style={{ width: '24px', height: '24px', color: 'white' }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 'bold', color: '#111827' }}>INV-002</p>
                      <p style={{ fontSize: '14px', color: '#6b7280' }}>TechStart Inc</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>$1800</p>
                    <span style={{ 
                      display: 'inline-block',
                      padding: '2px 12px', 
                      borderRadius: '9999px', 
                      fontSize: '12px', 
                      fontWeight: '500', 
                      backgroundColor: '#fef3c7', 
                      color: '#92400e' 
                    }}>pending</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
    }
  }

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex' }}>
      {/* Sidebar */}
      <div style={{ 
        width: '288px', 
        backgroundColor: '#5b68eb', 
        color: 'white', 
        flexShrink: 0 
      }}>
        {/* Logo/Brand Section */}
        <div style={{ 
          padding: '32px', 
          borderBottom: '1px solid rgba(255,255,255,0.2)' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              backgroundColor: 'rgba(255,255,255,0.2)', 
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <FileText style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>InvoiceFlow</h2>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>Consulting Invoices</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: '24px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id as Page)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '12px 24px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: currentPage === item.id ? 'rgba(255,255,255,0.2)' : 'transparent',
                color: 'white',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => {
                if (currentPage !== item.id) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== item.id) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              <item.icon style={{ width: '20px', height: '20px', flexShrink: 0 }} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

      </div>

      {/* Main Content */}
      <div style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        {/* Top Header */}
        <header style={{ 
          backgroundColor: 'white', 
          borderBottom: '1px solid #e5e7eb', 
          padding: '24px 32px' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>
                {sidebarItems.find(item => item.id === currentPage)?.label || 'Dashboard'}
              </h1>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>
                {currentPage === 'dashboard' && 'Overview of your business metrics'}
                {currentPage === 'clients' && 'Manage your client relationships'}
                {currentPage === 'invoices' && 'Create and manage invoices'}
                {currentPage === 'settings' && 'Configure your business settings'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button 
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onClick={() => setCurrentPage('invoices')}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
              >
                + New Invoice
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main>
          {renderPage()}
        </main>
      </div>
    </div>
  )
}

export default App