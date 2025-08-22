import { useState, useEffect } from 'react'
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

interface Invoice {
  id: number
  invoice_number: string
  client_id: number
  company_id: number
  date: string
  message?: string
  total_amount: number
  status: string
  pdf_path?: string
  markdown_path?: string
  created_at: string
}

interface Client {
  id: number
  name: string
  address?: string
  primary_contact?: string
  phone_number?: string
  email?: string
  created_at: string
}

interface DashboardStats {
  totalRevenue: number
  activeClients: number
  pendingInvoices: number
  paidInvoices: number
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalRevenue: 0,
    activeClients: 0,
    pendingInvoices: 0,
    paidInvoices: 0
  })
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<Client[]>([])

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch invoices
        const invoicesResponse = await fetch('http://localhost:8000/invoices/')
        const invoices: Invoice[] = await invoicesResponse.json()
        
        // Fetch clients
        const clientsResponse = await fetch('http://localhost:8000/clients/')
        const clientsList: Client[] = await clientsResponse.json()
        setClients(clientsList)

        // Calculate statistics
        const totalRevenue = invoices.reduce((sum, invoice) => sum + invoice.total_amount, 0)
        const pendingInvoices = invoices.filter(inv => inv.status === 'submitted').length
        const paidInvoices = invoices.filter(inv => inv.status === 'paid').length
        const activeClients = clientsList.length

        setDashboardStats({
          totalRevenue,
          activeClients,
          pendingInvoices,
          paidInvoices
        })

        // Get recent invoices (last 5, sorted by creation date)
        const recent = invoices
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
        setRecentInvoices(recent)

      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      }
    }

    if (currentPage === 'dashboard') {
      fetchDashboardData()
    }
  }, [currentPage])

  // Helper function to get client name by ID
  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId)
    return client?.name || 'Unknown Client'
  }

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
                    <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>${dashboardStats.totalRevenue.toLocaleString()}</p>
                    <p style={{ fontSize: '12px', color: '#10b981' }}>💰 All invoices</p>
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
                    <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>{dashboardStats.activeClients}</p>
                    <p style={{ fontSize: '12px', color: '#3b82f6' }}>👥 Total clients</p>
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
                    <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>{dashboardStats.pendingInvoices}</p>
                    <p style={{ fontSize: '12px', color: '#f59e0b' }}>⏳ Awaiting payment</p>
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
                    <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>{dashboardStats.paidInvoices}</p>
                    <p style={{ fontSize: '12px', color: '#10b981' }}>✅ Total paid</p>
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
                <button 
                  style={{ 
                    color: '#3b82f6', 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    border: 'none', 
                    background: 'transparent', 
                    cursor: 'pointer' 
                  }}
                  onClick={() => setCurrentPage('invoices')}
                >
                  View All
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentInvoices.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px', 
                    color: '#6b7280' 
                  }}>
                    No invoices yet. Create your first invoice!
                  </div>
                ) : (
                  recentInvoices.map((invoice) => (
                    <div 
                      key={invoice.id}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '16px', 
                        borderRadius: '8px',
                        transition: 'background-color 0.2s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
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
                          <p style={{ fontWeight: 'bold', color: '#111827' }}>#{invoice.invoice_number}</p>
                          <p style={{ fontSize: '14px', color: '#6b7280' }}>{getClientName(invoice.client_id)}</p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>${invoice.total_amount.toLocaleString()}</p>
                        <span style={{ 
                          display: 'inline-block',
                          padding: '2px 12px', 
                          borderRadius: '9999px', 
                          fontSize: '12px', 
                          fontWeight: '500', 
                          backgroundColor: invoice.status === 'paid' ? '#dcfce7' : '#fef3c7', 
                          color: invoice.status === 'paid' ? '#166534' : '#92400e'
                        }}>
                          {invoice.status === 'submitted' ? 'pending' : invoice.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
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
                {currentPage === 'clients' ? 'Client Management' : 
                 currentPage === 'settings' ? 'Company Settings' : 
                 sidebarItems.find(item => item.id === currentPage)?.label || 'Dashboard'}
              </h1>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>
                {currentPage === 'dashboard' && 'Overview of your business metrics'}
                {currentPage === 'clients' && 'Manage your client relationships and contact information'}
                {currentPage === 'invoices' && 'Create and manage invoices'}
                {currentPage === 'settings' && 'Manage your company information for invoices'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {currentPage === 'clients' ? (
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
                    transition: 'background-color 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onClick={() => {
                    // This will trigger the client form - we'll handle this through a custom event or state
                    window.dispatchEvent(new CustomEvent('addNewClient'))
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                >
                  + Add New Client
                </button>
              ) : currentPage === 'settings' ? null : (
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
                  onClick={() => {
                    if (currentPage === 'invoices') {
                      window.dispatchEvent(new CustomEvent('newInvoice'))
                    } else {
                      setCurrentPage('invoices')
                    }
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                >
                  + New Invoice
                </button>
              )}
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