'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Users, MapPin, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react'
import { Startup, StartupInvestor } from '@/types/startup'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getStartupInvestors } from '@/lib/api/startup-service'

interface StartupInvestorsModalProps {
  startup: Startup
  isOpen: boolean
  onClose: () => void
}

export function StartupInvestorsModal({ startup, isOpen, onClose }: StartupInvestorsModalProps) {
  const [investors, setInvestors] = useState<StartupInvestor[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    if (isOpen) {
      fetchInvestors(1)
    }
  }, [isOpen, startup.id])

  const fetchInvestors = async (page: number) => {
    setLoading(true)
    try {
      const data = await getStartupInvestors(startup.id, page, 20)
      setInvestors(data.investidores)
      setStats(data.estatisticas)
      setCurrentPage(page)
      setTotalPages(data.pagination.total_pages)
    } catch (error) {
      console.error('Erro ao carregar investidores:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (page: number) => {
    fetchInvestors(page)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const exportCSV = () => {
    console.log('API Call: GET /api/startups/' + startup.id + '/investors/export', {
      format: 'csv',
      respect_privacy: true,
      timestamp: new Date().toISOString()
    })
    
    // Simulate CSV download
    const csvContent = investors
      .map(investor => {
        const email = investor.perfil_publico ? investor.email : '****@****.***'
        const location = investor.localizacao ? 
          `${investor.localizacao.cidade}, ${investor.localizacao.uf}` : 
          'N/A'
        
        return [
          investor.id,
          investor.nome,
          email,
          formatCurrency(investor.total_investido),
          investor.total_tokens,
          formatDate(investor.data_primeiro_investimento),
          investor.numero_investimentos,
          location
        ].join(',')
      })
      .join('\n')
    
    console.log('CSV Export Preview:', csvContent.slice(0, 200) + '...')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Investidores - {startup.nome}
          </DialogTitle>
        </DialogHeader>

        {loading && investors.length === 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 w-24 bg-muted rounded mb-2" />
                    <div className="h-8 w-16 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="h-64 bg-muted rounded animate-pulse" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Statistics Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Total de Investidores</CardDescription>
                    <CardTitle className="text-2xl text-blue-600">
                      {stats.total_investidores}
                    </CardTitle>
                  </CardHeader>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Perfis Públicos</CardDescription>
                    <CardTitle className="text-2xl text-green-600">
                      {stats.total_publicos}
                    </CardTitle>
                  </CardHeader>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Ticket Médio</CardDescription>
                    <CardTitle className="text-2xl text-violet-600">
                      {formatCurrency(stats.ticket_medio)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Investimento Total</CardDescription>
                    <CardTitle className="text-2xl text-orange-600">
                      {formatCurrency(stats.investimento_total)}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>
            )}

            {/* Privacy Notice */}
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <EyeOff className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                      Privacidade dos Investidores
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-300">
                      Alguns investidores optaram por manter seus dados privados. 
                      Emails e localizações são mascarados para preservar a privacidade.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Investors Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Lista de Investidores</CardTitle>
                  <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV}>
                    <Download className="h-4 w-4" />
                    Exportar CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {investors.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhum investidor encontrado</h3>
                    <p className="text-muted-foreground">
                      Esta startup ainda não possui investidores registrados.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Investidor</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Total Investido</TableHead>
                            <TableHead>Tokens</TableHead>
                            <TableHead>Investimentos</TableHead>
                            <TableHead>Primeiro Investimento</TableHead>
                            <TableHead>Localização</TableHead>
                            <TableHead>Privacidade</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {investors.map((investor) => (
                            <TableRow key={investor.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={investor.foto_url || undefined} />
                                    <AvatarFallback className="text-xs">
                                      {getInitials(investor.nome)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{investor.nome}</p>
                                    <p className="text-xs text-muted-foreground">
                                      #{investor.id}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {investor.email}
                              </TableCell>
                              <TableCell className="font-bold">
                                {formatCurrency(investor.total_investido)}
                              </TableCell>
                              <TableCell>{investor.total_tokens.toLocaleString()}</TableCell>
                              <TableCell className="text-center">
                                {investor.numero_investimentos}
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatDate(investor.data_primeiro_investimento)}
                              </TableCell>
                              <TableCell>
                                {investor.localizacao ? (
                                  <div className="flex items-center gap-1 text-sm">
                                    <MapPin className="h-3 w-3" />
                                    {investor.localizacao.cidade}, {investor.localizacao.uf}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">N/A</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {investor.perfil_publico ? (
                                  <Badge variant="outline" className="gap-1">
                                    <Eye className="h-3 w-3" />
                                    Público
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="gap-1">
                                    <EyeOff className="h-3 w-3" />
                                    Privado
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1 || loading}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Anterior
                        </Button>
                        
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const pageNumber = i + 1
                            return (
                              <Button
                                key={pageNumber}
                                variant={currentPage === pageNumber ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handlePageChange(pageNumber)}
                                disabled={loading}
                                className="w-8 h-8 p-0"
                              >
                                {pageNumber}
                              </Button>
                            )
                          })}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages || loading}
                        >
                          Próximo
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}