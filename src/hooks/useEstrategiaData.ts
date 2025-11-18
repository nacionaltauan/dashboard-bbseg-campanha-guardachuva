"use client"

import { useState, useEffect } from "react"
import type { ResumoResponse, VeiculoData, MonthlyData } from "../types/estrategiaOnline"

export function useEstrategiaData() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [monthlyData, setMonthlyData] = useState<{ [key: string]: MonthlyData }>({})
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          "https://nacional-api-gray.vercel.app/google/sheets/1wNHPGsPX3wQuUCBs3an7iBzBY6Y7THYV7V1GijXZo44/data?range=Resumo!A1:E1000",
        )
        const data: ResumoResponse = await response.json()

        if (!data.success || !data.data?.values) {
          throw new Error("Failed to fetch data or invalid data structure")
        }

        const [headers, ...rows] = data.data.values

        // Parse raw data into structured format
        const veiculosData: VeiculoData[] = rows
          .map((row) => ({
            veiculo: row[0] || "",
            mes: row[1] || "",
            custoInvestido:
              Number.parseFloat((row[2] || "R$ 0,00").replace("R$", "").replace(/\./g, "").replace(",", ".").trim()) ||
              0,
            custoPrevisto:
              Number.parseFloat((row[3] || "R$ 0,00").replace("R$", "").replace(/\./g, "").replace(",", ".").trim()) ||
              0,
            tipoCompra: row[4] || "",
          }))
          .filter((item) => item.veiculo && item.mes)

        // Group by month
        const monthlyGrouped: { [key: string]: MonthlyData } = {}

        veiculosData.forEach((item) => {
          if (!monthlyGrouped[item.mes]) {
            monthlyGrouped[item.mes] = {
              mes: item.mes,
              totalInvestido: 0,
              totalPrevisto: 0,
              pacing: 0,
              veiculos: {},
            }
          }

          monthlyGrouped[item.mes].totalInvestido += item.custoInvestido
          monthlyGrouped[item.mes].totalPrevisto += item.custoPrevisto
          monthlyGrouped[item.mes].veiculos[item.veiculo] = {
            custoInvestido: item.custoInvestido,
            custoPrevisto: item.custoPrevisto,
            tipoCompra: item.tipoCompra,
            pacing: item.custoPrevisto > 0 ? (item.custoInvestido / item.custoPrevisto) * 100 : 0,
          }
        })

        // Calculate pacing for each month
        Object.values(monthlyGrouped).forEach((month) => {
          month.pacing = month.totalPrevisto > 0 ? (month.totalInvestido / month.totalPrevisto) * 100 : 0
        })

        setMonthlyData(monthlyGrouped)

        // Set the most recent month as selected
        const months = Object.keys(monthlyGrouped)
        if (months.length > 0) {
          setSelectedMonth(months[0])
        }
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return { monthlyData, selectedMonth, setSelectedMonth, loading, error }
}
