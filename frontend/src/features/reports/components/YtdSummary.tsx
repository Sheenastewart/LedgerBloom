import { InfoTooltip } from '../../../components/InfoTooltip'
import { formatCurrency } from '../../../utils/moneyUtils'
import { CALCULATION_DEFS } from '../../guidance/calculationDefs'
import { HelpLink } from '../../guidance/HelpLink'
import { monthLabel } from '../reportsFormat'
import type { MonthMetricSummary, YearToDateResponse } from '../types'
import { TrendsTable } from './TrendsTable'
import '../../guidance/help.css'

type YtdSummaryProps = {
  data: YearToDateResponse
}

function metricSummaryText(summary: MonthMetricSummary | null): string {
  if (!summary) {
    return 'No data available'
  }
  return `${monthLabel(summary)} · ${formatCurrency(summary.value)}`
}

export function YtdSummary({ data }: YtdSummaryProps) {
  return (
    <>
      <section aria-label="Year-to-date totals">
        <div className="reports-summary-grid">
          <article className="reports-card">
            <h2>Total income</h2>
            <p className="reports-card-value">{formatCurrency(data.totals.totalIncome)}</p>
          </article>
          <article className="reports-card">
            <h2>Total expenses</h2>
            <p className="reports-card-value">{formatCurrency(data.totals.totalExpenses)}</p>
          </article>
          <article className="reports-card">
            <h2>Net cash flow</h2>
            <p
              className={
                data.totals.netCashFlow < 0 ? 'reports-card-value negative' : 'reports-card-value'
              }
            >
              {formatCurrency(data.totals.netCashFlow)}
            </p>
          </article>
          <article className="reports-card">
            <h2 className="metric-heading">
              Average monthly income
              <InfoTooltip label="About year-to-date averages">
                {CALCULATION_DEFS.yearToDateAverage.short}
              </InfoTooltip>
            </h2>
            <p className="reports-card-value">{formatCurrency(data.averages.averageIncome)}</p>
          </article>
          <article className="reports-card">
            <h2 className="metric-heading">
              Average monthly expenses
              <InfoTooltip label="About year-to-date averages">
                {CALCULATION_DEFS.yearToDateAverage.short}
              </InfoTooltip>
            </h2>
            <p className="reports-card-value">{formatCurrency(data.averages.averageExpenses)}</p>
            <HelpLink to="/help?topic=ytd-average">Learn more</HelpLink>
          </article>
          <article className="reports-card">
            <h2>Average net cash flow</h2>
            <p
              className={
                data.averages.averageNetCashFlow < 0
                  ? 'reports-card-value negative'
                  : 'reports-card-value'
              }
            >
              {formatCurrency(data.averages.averageNetCashFlow)}
            </p>
          </article>
        </div>
      </section>

      <section className="reports-section" aria-labelledby="ytd-budget-heading">
        <h2 id="ytd-budget-heading">Budget overview</h2>
        <div className="reports-summary-grid">
          <article className="reports-card">
            <h2>Total budgeted</h2>
            <p className="reports-card-value">{formatCurrency(data.totalBudgeted)}</p>
          </article>
          <article className="reports-card">
            <h2>Total remaining</h2>
            <p
              className={
                data.totalBudgetRemaining < 0 ? 'reports-card-value negative' : 'reports-card-value'
              }
            >
              {formatCurrency(data.totalBudgetRemaining)}
            </p>
          </article>
          <article className="reports-card">
            <h2>Months over budget</h2>
            <p className="reports-card-value">{data.monthsOverBudget}</p>
          </article>
        </div>
      </section>

      <section className="reports-section" aria-labelledby="ytd-highlights-heading">
        <h2 id="ytd-highlights-heading">Highlights</h2>
        <div className="reports-highlights">
          <article className="reports-highlight">
            <h3 className="label">Highest income month</h3>
            <p>{metricSummaryText(data.highestIncomeMonth)}</p>
          </article>
          <article className="reports-highlight">
            <h3 className="label">Highest expense month</h3>
            <p>{metricSummaryText(data.highestExpenseMonth)}</p>
          </article>
          <article className="reports-highlight">
            <h3 className="label">Best net cash flow month</h3>
            <p>{metricSummaryText(data.bestNetCashFlowMonth)}</p>
          </article>
          <article className="reports-highlight">
            <h3 className="label">Worst net cash flow month</h3>
            <p>{metricSummaryText(data.worstNetCashFlowMonth)}</p>
          </article>
        </div>
      </section>

      <section className="reports-section" aria-labelledby="ytd-category-heading">
        <h2 id="ytd-category-heading">Spending by category</h2>
        {data.spendingByCategory.length === 0 ? (
          <p className="dashboard-empty">No expenses recorded this year.</p>
        ) : (
          <div className="reports-table-wrap">
            <table className="reports-table">
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col" className="numeric">
                    Entries
                  </th>
                  <th scope="col" className="numeric">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.spendingByCategory.map((row) => (
                  <tr key={row.categoryId}>
                    <th scope="row">{row.categoryName}</th>
                    <td className="numeric">{row.entryCount}</td>
                    <td className="numeric">{formatCurrency(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="reports-section" aria-labelledby="ytd-source-heading">
        <h2 id="ytd-source-heading">Income by source</h2>
        {data.incomeBySource.length === 0 ? (
          <p className="dashboard-empty">No income recorded this year.</p>
        ) : (
          <div className="reports-table-wrap">
            <table className="reports-table">
              <thead>
                <tr>
                  <th scope="col">Source</th>
                  <th scope="col" className="numeric">
                    Entries
                  </th>
                  <th scope="col" className="numeric">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.incomeBySource.map((row) => (
                  <tr key={row.source.toLowerCase()}>
                    <th scope="row">{row.source}</th>
                    <td className="numeric">{row.entryCount}</td>
                    <td className="numeric">{formatCurrency(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="reports-section" aria-labelledby="ytd-months-heading">
        <h2 id="ytd-months-heading">Month-by-month</h2>
        {data.monthSummaries.length === 0 ? (
          <p className="dashboard-empty">No months to display.</p>
        ) : (
          <TrendsTable months={data.monthSummaries} caption="Year-to-date monthly breakdown" />
        )}
      </section>
    </>
  )
}
