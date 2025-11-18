import { useState, useEffect } from "react"
import { VeiculoData, MonthlyMetrics, EstrategiaResponse } from "../types/estrategia"

export function useEstrategia() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [monthlyData, setMonthlyData] = useState<Record<string, MonthlyMetrics>>({})
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          "https://nacional-api-gray.vercel.app/google/sheets/1wNHPGsPX3wQuUCBs3an7iBzBY6Y7THYV7V1GijXZo44/data?range=Resumo!A1:E1000"
        )
        const data: EstrategiaResponse = await response.json()

        if (!data.success) throw new Error("Falha ao buscar dados")

        const [headers, ...rows] = data.data.values
        
        const veiculosData: VeiculoData[] = rows.map(row => ({
          veiculo: row[0],
          mes: row[1],
          custoInvestido: parseFloat(row[2].replace("R$", "").replace(/\./g, "").replace(",", ".").trim()) || 0,
          custoPrevisto: parseFloat(row[3].replace("R$", "").replace(/\./g, "").replace(",", ".").trim()) || 0,
          tipoCompra: row[4]
        }))

        const monthlyGrouped: Record<string, MonthlyMetrics> = {}

        veiculosData.forEach(item => {
          if (!monthlyGrouped[item.mes]) {
            monthlyGrouped[item.mes] = {
              mes: item.mes,
              totalInvestido: 0,
              totalPrevisto: 0,
              pacing: 0,
              veiculos: {}
            }
          }

          monthlyGrouped[item.mes].totalInvestido += item.custoInvestido
          monthlyGrouped[item.mes].totalPrevisto += item.custoPrevisto
          monthlyGrouped[item.mes].veiculos[item.veiculo] = {
            custoInvestido: item.custoInvestido,
            custoPrevisto: item.custoPrevisto,
            tipoCompra: item.tipoCompra,
            pacing: item.custoPrevisto > 0 ? (item.custoInvestido / item.custoPrevisto) * 100 : 0
          }
        })

        Object.values(monthlyGrouped).forEach(month => {
          month.pacing = month.totalPrevisto > 0 ? (month.totalInvestido / month.totalPrevisto) * 100 : 0
        })

        setMonthlyData(monthlyGrouped)
        setSelectedMonth(Object.keys(monthlyGrouped)[0])

      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return {
    monthlyData,
    selectedMonth,
    setSelectedMonth,
    loading,
    error
  }
}
