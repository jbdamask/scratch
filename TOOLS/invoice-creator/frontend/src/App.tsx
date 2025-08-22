import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import CompanyConfig from '@/components/CompanyConfig'
import ClientManagement from '@/components/ClientManagement'
import InvoiceGenerator from '@/components/InvoiceGenerator'
import { theme } from '@/theme'
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
  const [company, setCompany] = useState<any>(null)

  // Fetch company data for branding
  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const response = await fetch('http://localhost:8000/companies/')
        const companies = await response.json()
        if (companies.length > 0) {
          setCompany(companies[0]) // Use first company
        }
      } catch (error) {
        console.error('Error fetching company data:', error)
      }
    }

    fetchCompanyData()
  }, [])

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
        const pendingInvoices = invoices.filter(inv => {
          const status = inv.status || 'submitted' // Keep existing default
          return ['submitted', 'sent', 'pending', 'overdue'].includes(status)
        }).length
        const paidInvoices = invoices.filter(inv => (inv.status || 'submitted') === 'paid').length
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

  // Helper function to get status display info
  const getStatusDisplay = (status: string | undefined) => {
    const actualStatus = status || 'draft'
    const statusConfig = {
      'draft': { label: 'Draft', colors: theme.colors.draft },
      'sent': { label: 'Sent', colors: theme.colors.info },
      'pending': { label: 'Pending', colors: theme.colors.warning },
      'paid': { label: 'Paid', colors: theme.colors.success },
      'overdue': { label: 'Overdue', colors: theme.colors.error }
    }
    return statusConfig[actualStatus] || statusConfig['draft']
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
                ...theme.card.base,
                padding: '24px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ color: theme.colors.text.secondary, fontSize: '14px', marginBottom: '8px' }}>Total Revenue</p>
                    <p style={{ fontSize: '32px', fontWeight: 'bold', color: theme.colors.text.primary, marginBottom: '4px' }}>${dashboardStats.totalRevenue.toLocaleString()}</p>
                    <p style={{ fontSize: '12px', color: theme.colors.success.main }}>💰 All invoices</p>
                  </div>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    backgroundColor: theme.colors.success.bg, 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <DollarSign style={{ width: '24px', height: '24px', color: theme.colors.success.main }} />
                  </div>
                </div>
              </div>

              {/* Active Clients Card */}
              <div style={{ 
                ...theme.card.base,
                padding: '24px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ color: theme.colors.text.secondary, fontSize: '14px', marginBottom: '8px' }}>Active Clients</p>
                    <p style={{ fontSize: '32px', fontWeight: 'bold', color: theme.colors.text.primary, marginBottom: '4px' }}>{dashboardStats.activeClients}</p>
                    <p style={{ fontSize: '12px', color: theme.colors.secondary.main }}>👥 Total clients</p>
                  </div>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    backgroundColor: theme.colors.secondary.bg, 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <Users style={{ width: '24px', height: '24px', color: theme.colors.secondary.main }} />
                  </div>
                </div>
              </div>

              {/* Pending Invoices Card */}
              <div style={{ 
                ...theme.card.base,
                padding: '24px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ color: theme.colors.text.secondary, fontSize: '14px', marginBottom: '8px' }}>Pending Invoices</p>
                    <p style={{ fontSize: '32px', fontWeight: 'bold', color: theme.colors.text.primary, marginBottom: '4px' }}>{dashboardStats.pendingInvoices}</p>
                    <p style={{ fontSize: '12px', color: theme.colors.warning.main }}>⏳ Awaiting payment</p>
                  </div>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    backgroundColor: theme.colors.warning.bg, 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <Clock3 style={{ width: '24px', height: '24px', color: theme.colors.warning.main }} />
                  </div>
                </div>
              </div>

              {/* Paid Invoices Card */}
              <div style={{ 
                ...theme.card.base,
                padding: '24px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ color: theme.colors.text.secondary, fontSize: '14px', marginBottom: '8px' }}>Paid Invoices</p>
                    <p style={{ fontSize: '32px', fontWeight: 'bold', color: theme.colors.text.primary, marginBottom: '4px' }}>{dashboardStats.paidInvoices}</p>
                    <p style={{ fontSize: '12px', color: theme.colors.success.main }}>✅ Total paid</p>
                  </div>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    backgroundColor: theme.colors.success.bg, 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <CheckCircle style={{ width: '24px', height: '24px', color: theme.colors.success.main }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Invoices */}
            <div style={{ 
              ...theme.card.base,
              padding: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: theme.colors.text.primary }}>Recent Invoices</h2>
                <button 
                  style={{ 
                    color: theme.colors.secondary.main, 
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
                    color: theme.colors.text.secondary 
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
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.gray[50]}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ 
                          width: '48px', 
                          height: '48px', 
                          backgroundColor: theme.colors.secondary.main, 
                          borderRadius: '8px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center' 
                        }}>
                          <FileText style={{ width: '24px', height: '24px', color: theme.colors.text.white }} />
                        </div>
                        <div>
                          <p style={{ fontWeight: 'bold', color: theme.colors.text.primary }}>#{invoice.invoice_number}</p>
                          <p style={{ fontSize: '14px', color: theme.colors.text.secondary }}>{getClientName(invoice.client_id)}</p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 'bold', color: theme.colors.text.primary, marginBottom: '4px' }}>${invoice.total_amount.toLocaleString()}</p>
                        <span style={{ 
                          display: 'inline-block',
                          padding: '2px 12px', 
                          borderRadius: '9999px', 
                          fontSize: '12px', 
                          fontWeight: '500', 
                          backgroundColor: getStatusDisplay(invoice.status).colors.bg, 
                          color: getStatusDisplay(invoice.status).colors.text
                        }}>
                          {getStatusDisplay(invoice.status).label.toLowerCase()}
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
    <div style={{ minHeight: '100vh', backgroundColor: theme.colors.background.main, display: 'flex' }}>
      {/* Sidebar */}
      <div style={{ 
        width: '288px', 
        backgroundColor: theme.colors.background.sidebar, 
        color: theme.colors.text.white, 
        flexShrink: 0 
      }}>
        {/* Logo/Brand Section */}
        <div style={{ 
          padding: '32px', 
          borderBottom: `1px solid ${theme.colors.border.light}` 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {company?.logos && company.logos.length > 0 ? (
              // Show company logo if available
              <img 
                src={`http://localhost:8000${company.logos.find((logo: any) => logo.is_default)?.file_path || company.logos[0].file_path}`}
                alt={`${company.name} logo`}
                style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '12px',
                  objectFit: 'cover',
                  border: `2px solid ${theme.colors.border.light}`
                }}
              />
            ) : (
              // Fallback to icon if no logo
              <div style={{ 
                width: '48px', 
                height: '48px', 
                backgroundColor: theme.colors.border.light, 
                borderRadius: '12px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <FileText style={{ width: '24px', height: '24px', color: theme.colors.text.white }} />
              </div>
            )}
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: theme.colors.text.white }}>
                {company?.name || 'InvoiceFlow'}
              </h2>
              <p style={{ fontSize: '14px', color: theme.colors.text.light }}>
                Consulting Invoices
              </p>
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
                backgroundColor: currentPage === item.id ? theme.colors.border.light : 'transparent',
                color: theme.colors.text.white,
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => {
                if (currentPage !== item.id) {
                  e.currentTarget.style.backgroundColor = theme.colors.primary.bg
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
      <div style={{ flex: 1, backgroundColor: theme.colors.background.main }}>
        {/* Top Header */}
        <header style={{ 
          backgroundColor: theme.colors.background.card, 
          borderBottom: `1px solid ${theme.colors.border.main}`, 
          padding: '24px 32px' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: theme.colors.text.primary, marginBottom: '4px' }}>
                {currentPage === 'clients' ? 'Client Management' : 
                 currentPage === 'settings' ? 'Company Settings' : 
                 sidebarItems.find(item => item.id === currentPage)?.label || 'Dashboard'}
              </h1>
              <p style={{ fontSize: '14px', color: theme.colors.text.secondary }}>
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
                    backgroundColor: theme.colors.secondary.main,
                    color: theme.colors.text.white,
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
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.secondary.dark}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.colors.secondary.main}
                >
                  + Add New Client
                </button>
              ) : currentPage === 'settings' ? null : (
                <button 
                  style={{
                    backgroundColor: theme.colors.secondary.main,
                    color: theme.colors.text.white,
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
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.secondary.dark}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.colors.secondary.main}
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