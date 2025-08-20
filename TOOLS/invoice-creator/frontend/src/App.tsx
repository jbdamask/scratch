import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import CompanyConfig from '@/components/CompanyConfig'
import ClientManagement from '@/components/ClientManagement'
import InvoiceGenerator from '@/components/InvoiceGenerator'
import { Building2, Users, FileText } from 'lucide-react'

type Page = 'home' | 'company' | 'clients' | 'invoices'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home')

  const renderPage = () => {
    switch (currentPage) {
      case 'company':
        return <CompanyConfig />
      case 'clients':
        return <ClientManagement />
      case 'invoices':
        return <InvoiceGenerator />
      default:
        return (
          <div className="max-w-4xl mx-auto p-6">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-4">Invoice Creator</h1>
              <p className="text-lg text-muted-foreground">
                Manage your company information, clients, and create professional invoices
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setCurrentPage('company')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Company Setup
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Configure your company information, address, and logo for invoices
                  </p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setCurrentPage('clients')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Client Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Add, edit, and manage your client database with contact information
                  </p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setCurrentPage('invoices')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Create Invoice
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Generate professional invoices with CSV import and automatic PDF/Markdown export
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 
              className="text-xl font-bold cursor-pointer" 
              onClick={() => setCurrentPage('home')}
            >
              Invoice Creator
            </h1>
            <div className="flex gap-2">
              <Button
                variant={currentPage === 'company' ? 'default' : 'outline'}
                onClick={() => setCurrentPage('company')}
                className="flex items-center gap-2"
              >
                <Building2 size={16} />
                Company
              </Button>
              <Button
                variant={currentPage === 'clients' ? 'default' : 'outline'}
                onClick={() => setCurrentPage('clients')}
                className="flex items-center gap-2"
              >
                <Users size={16} />
                Clients
              </Button>
              <Button
                variant={currentPage === 'invoices' ? 'default' : 'outline'}
                onClick={() => setCurrentPage('invoices')}
                className="flex items-center gap-2"
              >
                <FileText size={16} />
                Invoices
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-6">
        {renderPage()}
      </main>
    </div>
  )
}

export default App