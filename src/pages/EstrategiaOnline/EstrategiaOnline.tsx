"use client"

import type React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import { Globe, BarChart3, Tv, Smartphone, Monitor, Eye, Play, MousePointer, Users, Calendar, MapPin } from "lucide-react"
import { useEstrategiaOnlineData } from "../../services/api"
import PDFDownloadButton from "../../components/PDFDownloadButton/PDFDownloadButton"
import Loading from "../../components/Loading/Loading"

interface VehicleData {
  modalidade: string
  veiculo: string
  mes: string
  custoInvestido: number
  custoPrevisto: number
  tipoCompra: string
}

interface MesTotals {
  mes: string
  totalInvestido: number
  totalPrevisto: number
  pacing: number
}

interface CampaignSummary {
  totalInvestimentoPrevisto: number
  totalCustoInvestido: number
  pacingGeral: number
  mesesAtivos: number
}

interface AggregatedVehicleData {
  modalidade: string
  veiculo: string
  custoInvestido: number
  custoPrevisto: number
  pacing: number
  shareInvestimentoTotal: number
  tipoCompra: string
}

const EstrategiaOnline: React.FC = () => {
  const contentRef = useRef<HTMLDivElement>(null) 
  const { data: estrategiaData, loading, error } = useEstrategiaOnlineData()
  const [vehicleData, setVehicleData] = useState<VehicleData[]>([])
  const [mesesTotals, setMesesTotals] = useState<MesTotals[]>([])
  const [selectedMes, setSelectedMes] = useState<string | null>(null)
  const [availableMeses, setAvailableMeses] = useState<string[]>([])
  const [selectedModalidades, setSelectedModalidades] = useState<string[]>([])
  const [availableModalidades, setAvailableModalidades] = useState<string[]>([])
  const [campaignSummary, setCampaignSummary] = useState<CampaignSummary>({
    totalInvestimentoPrevisto: 0,
    totalCustoInvestido: 0,
    pacingGeral: 0,
    mesesAtivos: 0,
  })

  // Ícones para diferentes plataformas
  const getPlatformIcon = (platform: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      SEARCH: <Globe className="w-5 h-5" />,
      YOUTUBE: <Tv className="w-5 h-5" />,
      CRITEO: <Monitor className="w-5 h-5" />,
      "MEDIA SMART": <Monitor className="w-5 h-5" />,
      UOL: <Eye className="w-5 h-5" />,
      META: <Smartphone className="w-5 h-5" />,
      TIKTOK: <Play className="w-5 h-5" />,
      PINTEREST: <Eye className="w-5 h-5" />,
    }
    return iconMap[platform.toUpperCase()] || <Globe className="w-5 h-5" />
  }

  // Cores para diferentes plataformas
  const getPlatformColor = (platform: string) => {
    const colorMap: Record<string, string> = {
      SEARCH: "#4285f4",
      YOUTUBE: "#ff0000",
      CRITEO: "#ff6b35",
      "MEDIA SMART": "#3498db",
      UOL: "#00a86b",
      META: "#0668E1",
      TIKTOK: "#ff0050",
      PINTEREST: "#E60023",
    }
    return colorMap[platform.toUpperCase()] || "#6366f1"
  }

  // Função para obter cor do pacing (amarelo baixo → azul alto)
  const getPacingColor = (pacing: number) => {
    const normalizedPacing = Math.min(Math.max(pacing / 100, 0), 1)
    const yellow = { r: 251, g: 191, b: 36 }
    const blue = { r: 59, g: 130, b: 246 }
    const r = Math.round(yellow.r + (blue.r - yellow.r) * normalizedPacing)
    const g = Math.round(yellow.g + (blue.g - yellow.g) * normalizedPacing)
    const b = Math.round(yellow.b + (blue.b - yellow.b) * normalizedPacing)
    return `rgb(${r}, ${g}, ${b})`
  }

  // Função para converter string monetária em número
  const parseMonetaryValue = (value: string): number => {
    if (!value || value === "R$ 0,00") return 0
    return Number.parseFloat(value.replace("R$", "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")) || 0
  }

  // Processar dados da API
  useEffect(() => {
    if (estrategiaData?.data?.values) {
      const headers = estrategiaData.data.values[0]
      const rows = estrategiaData.data.values.slice(1)

      const processed: VehicleData[] = rows
        .map((row: any[]) => {
          const custoInvestido = parseMonetaryValue(row[3]) // Coluna "Custo Investido" (D)
          const custoPrevisto = parseMonetaryValue(row[4]) // Coluna "Custo Previsto" (E)

          return {
            modalidade: row[0] || "", // Primeira coluna (Modalidade)
            veiculo: row[1] || "", // Segunda coluna (Veículo)
            mes: row[2] || "", // Terceira coluna (MÊS)
            custoInvestido,
            custoPrevisto,
            tipoCompra: row[5] || "", // Sexta coluna (Tipo de Compra)
          }
        })
        .filter((vehicle: VehicleData) => vehicle.veiculo && vehicle.mes)

      // Calcular totais por mês
      const mesMap: Record<string, MesTotals> = {}
      processed.forEach((vehicle) => {
        if (!mesMap[vehicle.mes]) {
          mesMap[vehicle.mes] = {
            mes: vehicle.mes,
            totalInvestido: 0,
            totalPrevisto: 0,
            pacing: 0,
          }
        }
        mesMap[vehicle.mes].totalInvestido += vehicle.custoInvestido
        mesMap[vehicle.mes].totalPrevisto += vehicle.custoPrevisto
      })

      // Calcular pacing dos meses
      Object.values(mesMap).forEach((mes) => {
        mes.pacing = mes.totalPrevisto > 0 ? (mes.totalInvestido / mes.totalPrevisto) * 100 : 0
      })

      setMesesTotals(Object.values(mesMap))
      setVehicleData(processed)

      // Extrair meses únicos
      const meses = Array.from(new Set(processed.map((item) => item.mes)))
        .filter(Boolean)
        .sort()
      setAvailableMeses(meses)

      // Extrair modalidades únicas
      const modalidades = Array.from(new Set(processed.map((item) => item.modalidade)))
        .filter(Boolean)
        .sort()
      setAvailableModalidades(modalidades)

      // Calcular resumo da campanha
      const totalGeralPrevisto = processed.reduce((sum, v) => sum + v.custoPrevisto, 0)
      const totalGeralInvestido = processed.reduce((sum, v) => sum + v.custoInvestido, 0)

      const summary: CampaignSummary = {
        totalInvestimentoPrevisto: totalGeralPrevisto,
        totalCustoInvestido: totalGeralInvestido,
        pacingGeral: totalGeralPrevisto > 0 ? (totalGeralInvestido / totalGeralPrevisto) * 100 : 0,
        mesesAtivos: meses.length,
      }

      setCampaignSummary(summary)
    }
  }, [estrategiaData])

  // Dados agregados por veículo para a tabela
  const aggregatedVehicleData = useMemo(() => {
    let filteredData = selectedMes ? vehicleData.filter((vehicle) => vehicle.mes === selectedMes) : vehicleData
    
    // Aplicar filtro de praça
    if (selectedModalidades.length > 0) {
      filteredData = filteredData.filter((vehicle) => selectedModalidades.includes(vehicle.modalidade))
    }

    const aggregated: Record<string, AggregatedVehicleData> = {}

    filteredData.forEach((vehicle) => {
      const key = `${vehicle.modalidade}_${vehicle.veiculo}`
      if (!aggregated[key]) {
        aggregated[key] = {
          modalidade: vehicle.modalidade,
          veiculo: vehicle.veiculo,
          custoInvestido: 0,
          custoPrevisto: 0,
          pacing: 0,
          shareInvestimentoTotal: 0,
          tipoCompra: vehicle.tipoCompra,
        }
      }

      aggregated[key].custoInvestido += vehicle.custoInvestido
      aggregated[key].custoPrevisto += vehicle.custoPrevisto
    })

    // Calcular pacing e shares
    const totalPrevisto = Object.values(aggregated).reduce((sum, v) => sum + v.custoPrevisto, 0)

    Object.values(aggregated).forEach((vehicle) => {
      vehicle.pacing = vehicle.custoPrevisto > 0 ? (vehicle.custoInvestido / vehicle.custoPrevisto) * 100 : 0
      vehicle.shareInvestimentoTotal = totalPrevisto > 0 ? (vehicle.custoPrevisto / totalPrevisto) * 100 : 0
    })

    return Object.values(aggregated).sort((a, b) => b.custoPrevisto - a.custoPrevisto)
  }, [vehicleData, selectedMes, selectedModalidades])

  // Calcular totais filtrados
  const filteredTotals = useMemo(() => {
    const totalInvestido = aggregatedVehicleData.reduce((sum, v) => sum + v.custoInvestido, 0)
    const totalPrevisto = aggregatedVehicleData.reduce((sum, v) => sum + v.custoPrevisto, 0)
    const pacing = totalPrevisto > 0 ? (totalInvestido / totalPrevisto) * 100 : 0

    return { totalInvestido, totalPrevisto, pacing }
  }, [aggregatedVehicleData])

  // Função para formatar valores monetários
  const formatCurrency = (value: number): string => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  // Função para formatar números
  const formatNumber = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)} mi`
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)} mil`
    }
    return value.toLocaleString("pt-BR")
  }

  const toggleModalidade = (modalidade: string) => {
    setSelectedModalidades((prev) => {
      if (prev.includes(modalidade)) {
        return prev.filter((m) => m !== modalidade)
      }
      return [...prev, modalidade]
    })
  }

  if (loading) {
    return <Loading message="Carregando estratégia online..." />
  }

  if (error) {
    return (
      <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Erro ao carregar dados: {error.message}</p>
      </div>
    )
  }

  return (
    <div ref={contentRef} className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 text-enhanced">Estratégia Online</h1>
            <div className="flex items-center space-x-2 text-gray-600">
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Por Meses</span>
              </div>
              <span className="text-sm">• Campanha Nacional</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-600 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-lg">
          <PDFDownloadButton contentRef={contentRef} fileName="estrategia-online" />
          <span>Última atualização: {new Date().toLocaleString("pt-BR")}</span>
        </div>
      </div>

      {/* Filtro de Modalidade */}
      <div className="card-overlay rounded-lg shadow-lg p-4">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              Modalidades
            </label>
            <div className="flex flex-wrap gap-2">
              {availableModalidades.map((modalidade) => (
                <button
                  key={modalidade}
                  onClick={() => toggleModalidade(modalidade)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                    selectedModalidades.includes(modalidade)
                      ? "bg-blue-100 text-blue-800 border border-blue-300"
                      : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200"
                  }`}
                >
                  {modalidade}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cards Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Investimento Previsto */}
        <div className="card-overlay rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Investimento Previsto</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(campaignSummary.totalInvestimentoPrevisto)}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        {/* Custo Realizado */}
        <div className="card-overlay rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Custo Realizado</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(campaignSummary.totalCustoInvestido)}</p>
            </div>
            <MousePointer className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        {/* Pacing Geral */}
        <div className="card-overlay rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pacing Geral</p>
              <p className="text-xl font-bold text-gray-900">{campaignSummary.pacingGeral.toFixed(1)}%</p>
            </div>
            <Users className="w-8 h-8 text-green-600" />
          </div>
        </div>

        {/* Meses Ativos */}
        <div className="card-overlay rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Meses Ativos</p>
              <p className="text-xl font-bold text-gray-900">{campaignSummary.mesesAtivos}</p>
            </div>
            <Calendar className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Resumo por Mês - Cards Clicáveis */}
      <div className="card-overlay rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Resumo por Mês</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {mesesTotals.map((mes, index) => (
            <div
              key={index}
              className={`rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                selectedMes === mes.mes
                  ? "bg-blue-100 border-2 border-blue-500 shadow-md"
                  : "bg-gray-50 border-2 border-transparent hover:bg-gray-100 hover:shadow-sm"
              }`}
              onClick={() => setSelectedMes(selectedMes === mes.mes ? null : mes.mes)}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2 uppercase">{mes.mes}</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Previsto:</span>
                  <span className="font-medium">{formatCurrency(mes.totalPrevisto)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Realizado:</span>
                  <span className="font-medium">{formatCurrency(mes.totalInvestido)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pacing:</span>
                  <span className="font-semibold" style={{ color: getPacingColor(mes.pacing) }}>
                    {mes.pacing.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(mes.pacing, 100)}%`,
                      backgroundColor: getPacingColor(mes.pacing),
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        {selectedMes && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setSelectedMes(null)}
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Limpar seleção (ver todos os meses)
            </button>
          </div>
        )}
      </div>

      {/* Tabela de Veículos Agregados */}
      <div className="flex-1 card-overlay rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Estratégia e Execução {selectedMes && `- ${selectedMes.toUpperCase()}`}
          </h2>
          <div className="text-sm text-gray-500">
            {selectedMes ? `Dados do mês ${selectedMes.toUpperCase()}` : "Dados agregados de todos os meses"}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700 w-[15%]">Modalidade</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 w-[15%]">Veículo</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 w-[18%]">Investimento Previsto</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700 w-[12%]">Share (%)</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 w-[18%]">Custo Realizado</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700 w-[22%]">Pacing</th>
              </tr>
            </thead>
            <tbody>
              {aggregatedVehicleData.map((vehicle, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-4">
                    <span className="font-medium text-gray-900">{vehicle.modalidade}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${getPlatformColor(vehicle.veiculo)}20` }}
                      >
                        <div style={{ color: getPlatformColor(vehicle.veiculo) }}>
                          {getPlatformIcon(vehicle.veiculo)}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">{vehicle.veiculo}</span>
                        <div className="text-xs text-gray-500">{vehicle.tipoCompra}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="font-semibold text-gray-900">{formatCurrency(vehicle.custoPrevisto)}</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-gray-700">{vehicle.shareInvestimentoTotal.toFixed(2)}%</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="font-semibold text-gray-900">{formatCurrency(vehicle.custoInvestido)}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3 w-full">
                      <div className="flex-1 bg-gray-200 rounded-full h-3 relative overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(vehicle.pacing, 100)}%`,
                            backgroundColor: getPacingColor(vehicle.pacing),
                          }}
                        />
                        {vehicle.pacing > 100 && (
                          <div
                            className="absolute top-0 h-full opacity-70"
                            style={{
                              left: "100%",
                              width: `${Math.min(vehicle.pacing - 100, 50)}%`,
                              backgroundColor: getPacingColor(vehicle.pacing),
                            }}
                          />
                        )}
                      </div>
                      <span
                        className="text-sm font-medium text-right"
                        style={{ color: getPacingColor(vehicle.pacing) }}
                      >
                        {vehicle.pacing.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50/50">
                <td className="py-4 px-4 font-bold text-gray-900">-</td>
                <td className="py-4 px-4 font-bold text-gray-900">Total</td>
                <td className="py-4 px-4 text-right font-bold text-gray-900">
                  {formatCurrency(filteredTotals.totalPrevisto)}
                </td>
                <td className="py-4 px-4 text-center font-bold text-gray-900">100,00%</td>
                <td className="py-4 px-4 text-right font-bold text-gray-900">
                  {formatCurrency(filteredTotals.totalInvestido)}
                </td>
                <td className="py-4 px-4 text-center">
                  <span className="font-bold" style={{ color: getPacingColor(filteredTotals.pacing) }}>
                    {filteredTotals.pacing.toFixed(1)}%
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Observações */}
        <div className="mt-6 p-4 bg-blue-50/50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-gray-900 mb-2">Observações Importantes:</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>
              • Dados de resultados apresentados por mês, podendo sofrer alterações para mais ou para menos após
              finalização da campanha.
            </li>
            <li>
              • Por integração não sendo 100% compatível com as diversas plataformas de entrega, há diferenças entre os
              criativos e o valor de todos os veículos.
            </li>
            <li>
              • Dados de acompanhamento da mídia são diferentes na agenda mensal, não são os mesmos exibidos na
              campanha.
            </li>
            <li>• Dados de veículos são atualizados semanalmente de acordo com dados internos das plataformas.</li>
          </ul>
        </div>

        {/* Legenda de Cores do Pacing */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Legenda do Pacing:</h4>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: getPacingColor(0) }}></div>
              <span className="text-xs text-gray-600">0% - Baixo</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: getPacingColor(50) }}></div>
              <span className="text-xs text-gray-600">50% - Médio</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: getPacingColor(100) }}></div>
              <span className="text-xs text-gray-600">100% - Alto</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EstrategiaOnline
