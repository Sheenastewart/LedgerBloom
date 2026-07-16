export type HelpCategoryId =
  | 'getting-started'
  | 'categories'
  | 'expenses'
  | 'income'
  | 'dashboard'
  | 'budgets'
  | 'recurring-expenses'
  | 'recurring-income'
  | 'cash-flow-planning'
  | 'reports-and-trends'
  | 'csv-exports'
  | 'printable-reports'
  | 'understanding-calculations'
  | 'troubleshooting'
  | 'faq'

export type HelpTopic = {
  id: string
  categoryId: HelpCategoryId
  title: string
  summary: string
  keywords: string[]
  body: string[]
  relatedPath?: string
  relatedLabel?: string
}

export type HelpCategory = {
  id: HelpCategoryId
  title: string
  introduction: string
}

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    introduction: 'Learn the basic flow of LedgerBloom and where to begin.',
  },
  {
    id: 'categories',
    title: 'Categories',
    introduction: 'Organize expenses with reusable spending categories.',
  },
  {
    id: 'expenses',
    title: 'Expenses',
    introduction: 'Record money you spent.',
  },
  {
    id: 'income',
    title: 'Income',
    introduction: 'Record money you received.',
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    introduction: 'See a month’s income, expenses, budget, and cash-flow estimates.',
  },
  {
    id: 'budgets',
    title: 'Budgets',
    introduction: 'Set monthly spending limits and optional category limits.',
  },
  {
    id: 'recurring-expenses',
    title: 'Recurring Expenses',
    introduction: 'Track scheduled bills and obligations without auto-posting.',
  },
  {
    id: 'recurring-income',
    title: 'Recurring Income',
    introduction: 'Track expected pay and other repeating income schedules.',
  },
  {
    id: 'cash-flow-planning',
    title: 'Cash Flow Planning',
    introduction: 'Understand expected income, obligations, and projected cash flow.',
  },
  {
    id: 'reports-and-trends',
    title: 'Reports and Trends',
    introduction: 'Compare months and review year-to-date totals.',
  },
  {
    id: 'csv-exports',
    title: 'CSV Exports',
    introduction: 'Download monthly transaction and summary files.',
  },
  {
    id: 'printable-reports',
    title: 'Printable Reports',
    introduction: 'Print or save a monthly report as a PDF from your browser.',
  },
  {
    id: 'understanding-calculations',
    title: 'Understanding Calculations',
    introduction: 'Plain-language definitions for key LedgerBloom math.',
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    introduction: 'Common problems and what to try next.',
  },
  {
    id: 'faq',
    title: 'Frequently Asked Questions',
    introduction: 'Short answers to common questions.',
  },
]

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'getting-started-overview',
    categoryId: 'getting-started',
    title: 'How to get started with LedgerBloom',
    summary: 'Create categories, add income and expenses, then review the dashboard.',
    keywords: ['start', 'begin', 'overview', 'first', 'setup'],
    body: [
      'LedgerBloom helps you track income, expenses, budgets, and recurring schedules in one place.',
      'A practical order is: create categories, add expenses and income, set a monthly budget, then open the dashboard.',
      'Recurring schedules plan future cash flow. They become actual ledger entries only after you confirm Mark Paid or Mark Received.',
      'Reports summarize saved entries and clearly separate actual totals from projected recurring estimates.',
    ],
    relatedPath: '/dashboard',
    relatedLabel: 'Open dashboard',
  },
  {
    id: 'create-category',
    categoryId: 'categories',
    title: 'How to create a category',
    summary: 'Add a spending category so expenses can be grouped and filtered.',
    keywords: ['category', 'create', 'add', 'label', 'group'],
    body: [
      'Categories group expenses such as groceries, rent, or utilities.',
      'Open Categories, choose Add category, enter a name, optionally add a description, then save.',
      'Use clear names so reports and budgets stay easy to read.',
    ],
    relatedPath: '/categories',
    relatedLabel: 'Manage categories',
  },
  {
    id: 'why-category-cannot-delete',
    categoryId: 'categories',
    title: 'Why a category cannot be deleted',
    summary: 'Categories with linked expenses or recurring expense schedules cannot be removed.',
    keywords: ['delete', 'category', 'blocked', 'in use', 'cannot'],
    body: [
      'LedgerBloom prevents deleting a category that is still referenced by expenses or recurring expense schedules.',
      'To delete it, first reassign or remove those linked expenses and recurring items.',
      'This protects your history from orphaned spending with no category.',
    ],
    relatedPath: '/categories',
    relatedLabel: 'Manage categories',
  },
  {
    id: 'add-expense',
    categoryId: 'expenses',
    title: 'How to add an expense',
    summary: 'Record a spending transaction with amount, date, and category.',
    keywords: ['expense', 'spend', 'add', 'transaction', 'merchant'],
    body: [
      'Expenses are actual spending that already happened.',
      'Open Expenses, choose Add expense, enter description, amount, date, and category, then save.',
      'Optional merchant and notes help later search and exports.',
    ],
    relatedPath: '/expenses',
    relatedLabel: 'Manage expenses',
  },
  {
    id: 'month-category-filters',
    categoryId: 'expenses',
    title: 'How to use month and category filters',
    summary: 'Narrow expense or income lists to a month or category.',
    keywords: ['filter', 'month', 'category', 'search list'],
    body: [
      'On Expenses and similar list pages, use the month and category controls to focus on one period or group.',
      'Clear filters to return to the full list.',
      'Filters change which rows you see; they do not permanently delete data.',
    ],
    relatedPath: '/expenses',
    relatedLabel: 'Manage expenses',
  },
  {
    id: 'add-income',
    categoryId: 'income',
    title: 'How to add income',
    summary: 'Record money received with source, amount, and date.',
    keywords: ['income', 'pay', 'add', 'source', 'salary'],
    body: [
      'Income entries are actual money already received.',
      'Open Income, choose Add income, enter description, source, amount, and date, then save.',
      'Saved income feeds dashboard totals, reports, and net cash flow.',
    ],
    relatedPath: '/income',
    relatedLabel: 'Manage income',
  },
  {
    id: 'what-is-dashboard',
    categoryId: 'dashboard',
    title: 'What the dashboard shows',
    summary: 'Monthly totals, budget status, and cash-flow planning estimates.',
    keywords: ['dashboard', 'summary', 'month', 'overview'],
    body: [
      'The dashboard summarizes one selected month.',
      'Actual totals come from saved Income and Expense entries.',
      'Cash Flow Planning adds expected recurring income and obligations for the same month.',
      'Choose a month and year, then Apply to refresh the view.',
    ],
    relatedPath: '/dashboard',
    relatedLabel: 'Open dashboard',
  },
  {
    id: 'net-cash-flow',
    categoryId: 'understanding-calculations',
    title: 'What net cash flow means',
    summary: 'Actual income minus actual expenses.',
    keywords: ['net', 'cash flow', 'actual', 'calculation'],
    body: [
      'Net cash flow is actual income minus actual expenses for the selected period.',
      'It uses saved Income and Expense entries only.',
      'Recurring schedules are not included until Mark Paid or Mark Received creates real entries.',
    ],
    relatedPath: '/dashboard',
    relatedLabel: 'See it on the dashboard',
  },
  {
    id: 'projected-cash-flow',
    categoryId: 'understanding-calculations',
    title: 'What projected cash flow means',
    summary:
      'Actual income plus expected recurring income, minus actual expenses and expected obligations.',
    keywords: ['projected', 'estimate', 'cash flow', 'planning'],
    body: [
      'Projected cash flow combines recorded ledger totals with upcoming recurring estimates.',
      'Formula: actual income + expected recurring income − actual expenses − expected recurring obligations.',
      'Treat projected values as planning estimates, not guarantees.',
    ],
    relatedPath: '/dashboard',
    relatedLabel: 'See cash flow planning',
  },
  {
    id: 'remaining-budget',
    categoryId: 'understanding-calculations',
    title: 'What remaining budget means',
    summary: 'Monthly budget minus actual expenses.',
    keywords: ['remaining', 'budget', 'left', 'limit'],
    body: [
      'Remaining budget is the monthly budget limit minus actual expenses for that month.',
      'Category limits are optional planning ceilings tracked separately.',
    ],
    relatedPath: '/budgets',
    relatedLabel: 'Manage budgets',
  },
  {
    id: 'percent-used',
    categoryId: 'understanding-calculations',
    title: 'What percent used means',
    summary: 'Actual expenses divided by budget limit, as a percentage.',
    keywords: ['percent', 'used', 'budget', 'percentage'],
    body: [
      'Percent used is actual expenses divided by the budget limit, multiplied by 100.',
      'Budget status uses this value: under 80% is on track, 80% or more is near budget, over 100% is over budget.',
    ],
    relatedPath: '/budgets',
    relatedLabel: 'Manage budgets',
  },
  {
    id: 'expected-income',
    categoryId: 'understanding-calculations',
    title: 'What expected income means',
    summary: 'Active recurring income scheduled in the period but not yet recorded.',
    keywords: ['expected', 'income', 'recurring', 'estimate'],
    body: [
      'Expected income sums active recurring income schedules whose next expected date falls in the selected month.',
      'It is an estimate until Mark Received creates a saved income entry.',
    ],
    relatedPath: '/recurring-income',
    relatedLabel: 'Manage recurring income',
  },
  {
    id: 'expected-obligations',
    categoryId: 'understanding-calculations',
    title: 'What expected obligations means',
    summary: 'Active recurring expenses scheduled in the period but not yet recorded.',
    keywords: ['expected', 'obligations', 'bills', 'recurring'],
    body: [
      'Expected obligations sum active recurring expense schedules whose next payment date falls in the selected month.',
      'They are estimates until Mark Paid creates a saved expense.',
    ],
    relatedPath: '/recurring',
    relatedLabel: 'Manage recurring expenses',
  },
  {
    id: 'ytd-average',
    categoryId: 'understanding-calculations',
    title: 'What year-to-date averages mean',
    summary: 'Average monthly amounts across the months included in the YTD period.',
    keywords: ['average', 'year-to-date', 'ytd', 'monthly'],
    body: [
      'Year-to-date averages divide totals by the number of months included in the report.',
      'For the current year that is January through the current month. For past years it is all twelve months.',
    ],
    relatedPath: '/reports/year-to-date',
    relatedLabel: 'Open year-to-date report',
  },
  {
    id: 'set-monthly-budget',
    categoryId: 'budgets',
    title: 'How to set a monthly budget',
    summary: 'Create an overall spending limit for a month, with optional category limits.',
    keywords: ['budget', 'set', 'limit', 'monthly', 'create'],
    body: [
      'A monthly budget is your total spending ceiling for one month.',
      'Open Budgets, create a budget for a year and month, enter the total limit, then save.',
      'You can add optional category limits afterward for planning within the month.',
      'Actual spending always comes from saved expenses.',
    ],
    relatedPath: '/budgets',
    relatedLabel: 'Manage budgets',
  },
  {
    id: 'budget-status-labels',
    categoryId: 'budgets',
    title: 'On track, near budget, and over budget',
    summary: 'Status labels based on how much of the limit is used.',
    keywords: ['on track', 'near budget', 'over budget', 'status'],
    body: [
      'On track means spending is below 80% of the limit.',
      'Near budget means 80% or more is used, but spending has not exceeded the limit.',
      'Over budget means expenses exceed the limit.',
    ],
    relatedPath: '/budgets',
    relatedLabel: 'Manage budgets',
  },
  {
    id: 'recurring-vs-actual',
    categoryId: 'recurring-expenses',
    title: 'Difference between recurring and actual transactions',
    summary: 'Schedules plan the future; actual entries are saved ledger rows.',
    keywords: ['recurring', 'actual', 'schedule', 'difference'],
    body: [
      'Recurring items are schedules. They do not automatically create income or expense rows.',
      'Actual income and expenses exist only after you save them, or after Mark Received / Mark Paid confirms a due schedule.',
      'Reports and net cash flow use actual rows. Projected cash flow also includes scheduled estimates.',
    ],
    relatedPath: '/recurring',
    relatedLabel: 'Manage recurring expenses',
  },
  {
    id: 'how-mark-paid-works',
    categoryId: 'recurring-expenses',
    title: 'How Mark Paid works',
    summary: 'Confirm a due recurring expense to create a real expense entry.',
    keywords: ['mark paid', 'confirm', 'pay bill', 'recurring'],
    body: [
      'Mark Paid creates a saved Expense from a recurring expense schedule for the expected payment date.',
      'It also advances the next expected payment date for that schedule.',
      'You must confirm Mark Paid; LedgerBloom does not auto-post expenses in the background.',
    ],
    relatedPath: '/recurring',
    relatedLabel: 'Manage recurring expenses',
  },
  {
    id: 'upcoming-payments',
    categoryId: 'recurring-expenses',
    title: 'What upcoming payments means',
    summary: 'Active recurring expense schedules due in the selected window.',
    keywords: ['upcoming', 'payments', 'due', 'bills'],
    body: [
      'Upcoming payments list active recurring expense schedules with a next payment date in the selected period.',
      'Due status labels such as overdue or due soon are based on today’s date versus that next payment date.',
    ],
    relatedPath: '/recurring',
    relatedLabel: 'Manage recurring expenses',
  },
  {
    id: 'how-mark-received-works',
    categoryId: 'recurring-income',
    title: 'How Mark Received works',
    summary: 'Confirm a due recurring income schedule to create a real income entry.',
    keywords: ['mark received', 'confirm', 'paycheck', 'recurring income'],
    body: [
      'Mark Received creates a saved Income entry from a recurring income schedule for the expected date.',
      'It advances the next expected income date for that schedule.',
      'Until confirmed, recurring income remains an estimate in cash-flow planning.',
    ],
    relatedPath: '/recurring-income',
    relatedLabel: 'Manage recurring income',
  },
  {
    id: 'upcoming-income',
    categoryId: 'recurring-income',
    title: 'What upcoming income means',
    summary: 'Active recurring income schedules due in the selected window.',
    keywords: ['upcoming', 'income', 'due', 'paycheck'],
    body: [
      'Upcoming income lists active recurring income schedules with a next expected date in the selected period.',
      'Use Mark Received when the income is actually received to post it to the ledger.',
    ],
    relatedPath: '/recurring-income',
    relatedLabel: 'Manage recurring income',
  },
  {
    id: 'cash-flow-planning-overview',
    categoryId: 'cash-flow-planning',
    title: 'How cash flow planning works',
    summary: 'Estimated income and obligations for the selected month plus projected cash flow.',
    keywords: ['planning', 'cash flow', 'projected', 'expected'],
    body: [
      'Cash Flow Planning appears on the dashboard and printable monthly report.',
      'It shows expected income, expected obligations, and projected cash flow for the selected month.',
      'These figures include recurring schedules and are labeled as estimates.',
    ],
    relatedPath: '/dashboard',
    relatedLabel: 'Open dashboard',
  },
  {
    id: 'reports-overview',
    categoryId: 'reports-and-trends',
    title: 'How reports and trends work',
    summary: 'Compare months, review year-to-date totals, and separate actual from projected values.',
    keywords: ['reports', 'trends', 'comparison', 'ytd'],
    body: [
      'Reports summarize saved ledger entries and clearly separate actual values from projected recurring estimates.',
      'Trends compares multiple months. Year-to-date aggregates months for one year.',
      'Comparison ranges are limited to 24 months.',
    ],
    relatedPath: '/reports',
    relatedLabel: 'Open reports',
  },
  {
    id: 'export-csv',
    categoryId: 'csv-exports',
    title: 'How to export CSV files',
    summary: 'Download monthly transactions or a monthly summary as CSV.',
    keywords: ['csv', 'export', 'download', 'spreadsheet'],
    body: [
      'From Reports or the printable monthly report, choose a month and download transactions or summary CSV.',
      'Files use a text/csv content type and a suggested filename in Content-Disposition.',
      'Values that start with =, +, -, or @ are neutralized to reduce spreadsheet formula injection risk.',
    ],
    relatedPath: '/reports',
    relatedLabel: 'Open reports exports',
  },
  {
    id: 'print-monthly-report',
    categoryId: 'printable-reports',
    title: 'How to print or save a monthly report as PDF',
    summary: 'Use the browser print dialog from the printable monthly report page.',
    keywords: ['print', 'pdf', 'monthly report', 'save'],
    body: [
      'Open the monthly report, choose a month, then select Print report.',
      'Use your browser’s print dialog to print on paper or choose Save as PDF.',
      'Print styling hides navigation and interactive controls so the report title and selected period stay readable.',
    ],
    relatedPath: '/reports/monthly',
    relatedLabel: 'Open monthly report',
  },
  {
    id: 'api-unavailable',
    categoryId: 'troubleshooting',
    title: 'What to do when the API is unavailable',
    summary: 'Check that the backend is running, then use Retry on the page.',
    keywords: ['api', 'unavailable', 'offline', 'retry', 'connection'],
    body: [
      'If the home page or a feature page shows API unavailable, the frontend cannot reach the backend.',
      'Confirm the API is running (commonly on http://localhost:8080) and that the frontend uses the correct base URL.',
      'Use Retry on the page after the API is back online.',
    ],
    relatedPath: '/',
    relatedLabel: 'Check home status',
  },
  {
    id: 'unknown-route-404',
    categoryId: 'troubleshooting',
    title: 'Why an unknown API path returns 404',
    summary: 'Unknown API routes return RESOURCE_NOT_FOUND without exposing internals.',
    keywords: ['404', 'not found', 'resource', 'path', 'api'],
    body: [
      'If you request an API path that does not exist, LedgerBloom returns HTTP 404 with code RESOURCE_NOT_FOUND.',
      'This is expected and helps distinguish missing routes from server failures.',
      'Double-check the path—for example income uses /api/income, not /api/income-entries.',
    ],
  },
  {
    id: 'faq-auto-post',
    categoryId: 'faq',
    title: 'Does LedgerBloom automatically post recurring items?',
    summary: 'No. You confirm Mark Paid or Mark Received to create actual entries.',
    keywords: ['automatic', 'auto', 'post', 'background', 'faq'],
    body: [
      'Recurring schedules stay as schedules until you confirm them.',
      'There is no background job that creates expenses or income automatically in this stage of the product.',
    ],
  },
  {
    id: 'faq-reports-actual',
    categoryId: 'faq',
    title: 'Do reports double-count recurring schedules?',
    summary: 'No. Actual totals use Income and Expense rows only.',
    keywords: ['double count', 'reports', 'recurring', 'faq'],
    body: [
      'Actual income and expense totals come only from saved ledger entries.',
      'Projected and expected recurring values are labeled separately so they are not mixed into actual totals.',
    ],
    relatedPath: '/reports',
    relatedLabel: 'Open reports',
  },
]

export function filterHelpTopics(query: string): HelpTopic[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return HELP_TOPICS
  }

  return HELP_TOPICS.filter((topic) => {
    const haystack = [
      topic.title,
      topic.summary,
      ...topic.keywords,
      ...topic.body,
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(normalized)
  })
}

export function findHelpTopic(topicId: string): HelpTopic | undefined {
  return HELP_TOPICS.find((topic) => topic.id === topicId)
}
