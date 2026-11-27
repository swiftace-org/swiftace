// The demo site's content: settings, people, courses and their sections, a notebook with outputs
// and a tutor conversation. Fictional throughout, but shaped like a real deployment's data.

export const SITE = {
  general: {
    siteName: "Meridian Academy",
    companyName: "Meridian Learning",
    tagline: "Hands-on courses in data science and AI",
    description:
      "Learn Python, SQL, machine learning and AI by building real projects, with video lessons, notebooks and graded assignments.",
    supportEmail: "support@example.com",
    socialLinks: [
      { label: "YouTube", url: "https://www.youtube.com/" },
      { label: "LinkedIn", url: "https://www.linkedin.com/" },
    ],
  },
  home: {
    headline: "Learn Data Science\nby Building Projects",
    subtitle: "Video lessons, runnable notebooks and graded assignments, with an AI tutor for help",
    stats: [
      { value: "120+", label: "hours of lessons" },
      { value: "18,400", label: "learners enrolled" },
      { value: "4.8", label: "average rating" },
    ],
  },
}

export const ADMIN = { name: "Maya Raman", username: "maya", email: "admin@example.com" }

export const LEARNERS = [
  "Arjun Mehta",
  "Sofia Alvarez",
  "Daniel Okafor",
  "Hannah Schmidt",
  "Kenji Watanabe",
  "Priya Nair",
  "Lucas Moreau",
  "Amara Mensah",
  "Ethan Brooks",
  "Zara Hussain",
  "Mateo Rossi",
  "Chloe Nguyen",
].map((name) => {
  const username = name.toLowerCase().replace(" ", ".")
  return { name, username, email: `${username}@example.com` }
})

/** One of the instructor's public lessons, embedded as each video lesson's video. */
const VIDEO = "https://www.youtube.com/watch?v=kLDTbavcmd0"

export type DemoSection = {
  slug: string
  title: string
  type: "LESSON" | "ASSIGNMENT"
  shortDescription: string
  description?: string
  video?: boolean
  /** Served by the demo as the lesson's notebook. */
  notebook?: boolean
  alwaysOpen?: boolean
}

export type DemoCourse = {
  slug: string
  title: string
  shortDescription: string
  description: string
  isPaid: boolean
  cover: {
    from: string
    to: string
    motif: "chart" | "table" | "tree" | "network" | "bell" | "chat"
  }
  sections: DemoSection[]
}

export const COURSES: DemoCourse[] = [
  {
    slug: "data-analysis-with-python",
    title: "Data Analysis with Python",
    shortDescription:
      "Go from Python basics to analyzing real datasets with Numpy, Pandas and Matplotlib.",
    description: `A practical introduction to data analysis for complete beginners. Every lesson pairs a short video with a Jupyter notebook you can read alongside it, and each module ends with an assignment that's reviewed by an instructor.

## What you'll learn

- Programming fundamentals in Python: variables, functions, loops and data structures
- Numerical computing with Numpy arrays and vectorized operations
- Loading, cleaning, grouping and merging tabular data with Pandas
- Visualizing trends and distributions with Matplotlib and Seaborn
- Presenting an exploratory analysis of a real-world dataset

## Certificate

Complete the lessons and the three assignments to earn a verifiable certificate of accomplishment.`,
    isPaid: false,
    cover: { from: "#1d4ed8", to: "#7c3aed", motif: "chart" },
    sections: [
      {
        slug: "first-steps-with-python",
        title: "First Steps with Python",
        type: "LESSON",
        shortDescription: "Variables, data types, arithmetic and your first Python program",
        description: `Python is one of the most popular languages for data analysis because it reads almost like English. In this lesson you'll write your first lines of Python and learn how values are stored in variables.

\`\`\`python
cost_of_ice_bag = 1.25
profit_margin = 0.2
number_of_bags = 500

profit = cost_of_ice_bag * profit_margin * number_of_bags
print(f"The grocery store makes a profit of \${profit:.2f}")
\`\`\`

By the end of this lesson, you'll be comfortable with numbers, strings, booleans and lists.`,
        video: true,
        alwaysOpen: true,
      },
      {
        slug: "branching-loops-and-functions",
        title: "Branching, Loops and Functions",
        type: "LESSON",
        shortDescription:
          "Make decisions with if, repeat work with loops and reuse code with functions",
        video: true,
      },
      {
        slug: "numerical-computing-with-numpy",
        title: "Numerical Computing with Numpy",
        type: "LESSON",
        shortDescription: "Arrays, broadcasting and vectorized operations for fast computation",
        video: true,
      },
      {
        slug: "assignment-python-basics",
        title: "Assignment: Python Basics",
        type: "ASSIGNMENT",
        shortDescription: "Solve practice problems on variables, loops, functions and Numpy",
        description: `Put the first three lessons into practice. Work through the exercises in the starter notebook, then submit a link to your completed notebook.

- Write functions to compute loan EMIs for different interest rates
- Use loops to simulate a savings account over 10 years
- Replace a slow loop with a vectorized Numpy expression

Your submission will be reviewed within 3 working days.`,
      },
      {
        slug: "analyzing-tabular-data-with-pandas",
        title: "Analyzing Tabular Data with Pandas",
        type: "LESSON",
        shortDescription: "Read CSV files, then filter, group and summarize data frames",
        notebook: true,
      },
      {
        slug: "visualization-with-matplotlib",
        title: "Visualization with Matplotlib and Seaborn",
        type: "LESSON",
        shortDescription: "Line charts, bar charts, histograms and heatmaps that tell a story",
        video: true,
      },
      {
        slug: "exploratory-data-analysis-case-study",
        title: "Exploratory Data Analysis: A Case Study",
        type: "LESSON",
        shortDescription: "Analyze the Stack Overflow developer survey from start to finish",
        video: true,
      },
      {
        slug: "course-project",
        title: "Course Project: Your Own Analysis",
        type: "ASSIGNMENT",
        shortDescription: "Pick a dataset you care about and present an exploratory analysis",
      },
    ],
  },
  {
    slug: "sql-for-data-analysis",
    title: "SQL for Data Analysis",
    shortDescription: "Query, join and aggregate data in Postgres to answer business questions.",
    description: "Learn the SQL that analysts use every day, on a realistic e-commerce database.",
    isPaid: false,
    cover: { from: "#0f766e", to: "#0891b2", motif: "table" },
    sections: lessons([
      "Selecting and Filtering Rows",
      "Joins and Relationships",
      "Aggregation and Grouping",
      "Window Functions",
      "Assignment: Sales Report",
    ]),
  },
  {
    slug: "machine-learning-with-scikit-learn",
    title: "Machine Learning with Scikit-learn",
    shortDescription: "Train, tune and evaluate models for regression and classification.",
    description: "Build machine learning models for real-world problems with Scikit-learn.",
    isPaid: true,
    cover: { from: "#c2410c", to: "#db2777", motif: "tree" },
    sections: lessons([
      "Linear Regression",
      "Logistic Regression",
      "Decision Trees and Random Forests",
      "Gradient Boosting",
      "Assignment: Predicting House Prices",
    ]),
  },
  {
    slug: "deep-learning-with-pytorch",
    title: "Deep Learning with PyTorch",
    shortDescription: "Neural networks from first principles to transfer learning on GPUs.",
    description: "Train neural networks for images and text with PyTorch.",
    isPaid: true,
    cover: { from: "#4338ca", to: "#0f172a", motif: "network" },
    sections: lessons([
      "Tensors and Gradients",
      "Training Your First Neural Network",
      "Convolutional Networks",
      "Transfer Learning",
      "Assignment: Image Classifier",
    ]),
  },
  {
    slug: "statistics-for-data-science",
    title: "Statistics for Data Science",
    shortDescription: "Probability, distributions and hypothesis testing with hands-on examples.",
    description: "The statistics you need to reason about data with confidence.",
    isPaid: true,
    cover: { from: "#15803d", to: "#65a30d", motif: "bell" },
    sections: lessons([
      "Descriptive Statistics",
      "Probability Distributions",
      "Sampling and Confidence Intervals",
      "Hypothesis Testing",
    ]),
  },
  {
    slug: "building-apps-with-llms",
    title: "Building Apps with LLMs",
    shortDescription: "Prompting, retrieval, tool use and evaluation for AI-powered apps.",
    description: "Design, build and evaluate applications powered by large language models.",
    isPaid: true,
    cover: { from: "#9333ea", to: "#e11d48", motif: "chat" },
    sections: lessons([
      "Prompting Fundamentals",
      "Retrieval-Augmented Generation",
      "Tool Use and Agents",
      "Evaluating LLM Apps",
      "Assignment: A Support Chatbot",
    ]),
  },
]

function lessons(titles: string[]): DemoSection[] {
  return titles.map((title, i) => ({
    slug: title
      .toLowerCase()
      .replace(/^assignment: /, "assignment-")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-$/, ""),
    title,
    type: title.startsWith("Assignment") ? "ASSIGNMENT" : "LESSON",
    shortDescription: "",
    video: !title.startsWith("Assignment"),
    alwaysOpen: i === 0,
  }))
}

export function sectionVideo(section: DemoSection): string | null {
  return section.video ? VIDEO : null
}

/** How far each learner has got in the first course: the number of its sections they've done. */
export const LEARNER_PROGRESS = [8, 7, 6, 5, 5, 4, 3, 3, 2, 2, 1, 0]

/** The admin has done the first four sections, so the course page shows progress. */
export const ADMIN_PROGRESS = 4

export const TUTOR_CONVERSATION = {
  title: "Grouping orders by month in Pandas",
  sectionSlug: "analyzing-tabular-data-with-pandas",
  messages: [
    {
      role: "user",
      text: "How do I get total revenue per month instead of per region?",
    },
    {
      role: "assistant",
      text: `Group by the month of \`order_date\` instead of \`region\`. The \`.dt\` accessor gives you parts of a date column, and \`to_period("M")\` turns each date into its month:

\`\`\`python
monthly = (
    orders
    .groupby(orders["order_date"].dt.to_period("M"))["revenue"]
    .sum()
)
\`\`\`

This returns a Series indexed by month, like \`2024-01\`, \`2024-02\` and so on. Calling \`monthly.plot(kind="line")\` is a quick way to see the trend.

Want to try adding a second level, so you get revenue per month **and** per region?`,
    },
    { role: "user", text: "Yes! Would that just be a list in groupby?" },
    {
      role: "assistant",
      text: `Exactly. Pass both keys in a list, then use \`.unstack()\` to turn regions into columns:

\`\`\`python
orders.groupby([orders["order_date"].dt.to_period("M"), "region"])["revenue"].sum().unstack()
\`\`\`

Each row is now a month and each column a region, which is the shape \`.plot()\` needs to draw one line per region.`,
    },
  ],
}

/** A cover image's HTML, rendered to a 1200 × 630 PNG. */
export function coverHtml(course: DemoCourse): string {
  const { from, to, motif } = course.cover
  return `<!doctype html><html><body style="margin:0">
  <div style="width:1200px;height:630px;position:relative;overflow:hidden;
    background:linear-gradient(135deg,${from},${to});font-family:Inter,'Helvetica Neue',Arial,sans-serif">
    <div style="position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.14) 1.5px,transparent 1.5px);background-size:28px 28px"></div>
    <div style="position:absolute;right:-40px;top:60px;width:620px;height:520px;opacity:.95">${MOTIFS[motif]}</div>
    <div style="position:absolute;left:72px;bottom:72px;width:560px;color:white">
      <div style="font-size:22px;letter-spacing:.14em;text-transform:uppercase;opacity:.8;margin-bottom:18px">${SITE.general.siteName}</div>
      <div style="font-size:64px;font-weight:800;line-height:1.05">${course.title}</div>
    </div>
  </div></body></html>`
}

const W = "rgba(255,255,255,"
const MOTIFS: Record<DemoCourse["cover"]["motif"], string> = {
  chart: `<svg viewBox="0 0 620 520" width="620" height="520">
    <rect x="40" y="40" width="540" height="400" rx="24" fill="${W}.12)" stroke="${W}.35)" stroke-width="2"/>
    ${[160, 230, 190, 290, 250, 330, 300]
      .map(
        (h, i) =>
          `<rect x="${90 + i * 68}" y="${400 - h}" width="40" height="${h}" rx="8" fill="${W}${0.35 + i * 0.08})"/>`,
      )
      .join("")}
    <polyline points="110,250 178,200 246,225 314,140 382,170 450,95 518,115" fill="none" stroke="white" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  table: `<svg viewBox="0 0 620 520" width="620" height="520">
    ${[0, 1, 2, 3, 4, 5]
      .map((r) =>
        [0, 1, 2, 3]
          .map(
            (c) =>
              `<rect x="${60 + c * 130}" y="${60 + r * 66}" width="118" height="54" rx="10" fill="${W}${r === 0 ? 0.55 : 0.18})"/>`,
          )
          .join(""),
      )
      .join("")}
  </svg>`,
  tree: `<svg viewBox="0 0 620 520" width="620" height="520" stroke="${W}.7)" stroke-width="5" fill="none">
    <path d="M310 80 L170 220 M310 80 L450 220 M170 220 L100 370 M170 220 L240 370 M450 220 L380 370 M450 220 L520 370"/>
    ${[
      [310, 80],
      [170, 220],
      [450, 220],
      [100, 370],
      [240, 370],
      [380, 370],
      [520, 370],
    ]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="34" fill="${W}.3)" stroke="white"/>`)
      .join("")}
  </svg>`,
  network: `<svg viewBox="0 0 620 520" width="620" height="520">
    ${network()}
  </svg>`,
  bell: `<svg viewBox="0 0 620 520" width="620" height="520">
    <path d="M40 430 C 200 430, 230 90, 310 90 S 420 430, 580 430 Z" fill="${W}.25)" stroke="white" stroke-width="6"/>
    <line x1="310" y1="90" x2="310" y2="430" stroke="${W}.6)" stroke-width="3" stroke-dasharray="10 10"/>
  </svg>`,
  chat: `<svg viewBox="0 0 620 520" width="620" height="520">
    <rect x="60" y="70" width="380" height="110" rx="28" fill="${W}.25)"/>
    <rect x="200" y="210" width="380" height="140" rx="28" fill="${W}.4)"/>
    <rect x="60" y="380" width="300" height="90" rx="28" fill="${W}.25)"/>
    ${[0, 1, 2].map((i) => `<rect x="240" y="${245 + i * 30}" width="${300 - i * 80}" height="12" rx="6" fill="white"/>`).join("")}
  </svg>`,
}

function network(): string {
  const layers = [3, 5, 5, 2].map((n, l) =>
    Array.from({ length: n }, (_, i) => [90 + l * 150, 260 + (i - (n - 1) / 2) * 85]),
  )
  const edges = layers
    .slice(1)
    .flatMap((layer, l) =>
      layer.flatMap(([x2, y2]) =>
        layers[l]!.map(
          ([x1, y1]) =>
            `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${W}.35)" stroke-width="2"/>`,
        ),
      ),
    )
  const nodes = layers
    .flat()
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="22" fill="${W}.85)"/>`)
  return edges.join("") + nodes.join("")
}

/** The site icon: a rounded square with a rising line, rendered to a 512 px PNG. */
export const ICON_HTML = `<!doctype html><html><body style="margin:0;background:transparent">
<svg width="512" height="512" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2563eb"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <polyline points="112,356 208,252 280,304 400,164" fill="none" stroke="white" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="400" cy="164" r="30" fill="white"/>
</svg></body></html>`

const ORDERS = [
  ["ORD-10231", "2024-01-03", "North", "Electronics", 2, 1198.0],
  ["ORD-10232", "2024-01-03", "West", "Home & Kitchen", 5, 214.95],
  ["ORD-10233", "2024-01-04", "South", "Books", 3, 47.97],
  ["ORD-10234", "2024-01-04", "East", "Electronics", 1, 649.0],
  ["ORD-10235", "2024-01-05", "North", "Clothing", 4, 159.6],
] as const

const REGIONS = [
  ["East", 1284310.5],
  ["North", 1102764.25],
  ["South", 864920.8],
  ["West", 1517432.1],
] as const

/** A lesson notebook in nbformat 4, with a data frame, a summary and a chart among its outputs. */
export function demoNotebook() {
  const md = (source: string) => ({ cell_type: "markdown", metadata: {}, source })
  let count = 0
  const code = (source: string, outputs: unknown[] = []) => ({
    cell_type: "code",
    execution_count: ++count,
    metadata: {},
    source,
    outputs,
  })
  const result = (data: Record<string, string>) => ({
    output_type: "execute_result",
    execution_count: count + 1,
    metadata: {},
    data,
  })

  const head = [
    "    order_id order_date region        category  units  revenue",
    ...ORDERS.map(
      ([id, date, region, category, units, revenue], i) =>
        `${i}  ${id} ${date} ${region.padEnd(6)} ${category.padStart(15)} ${String(units).padStart(6)} ${revenue.toFixed(2).padStart(8)}`,
    ),
  ].join("\n")

  return {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: { display_name: "Python 3", language: "python", name: "python3" },
      language_info: { name: "python", version: "3.12.4" },
    },
    cells: [
      md(
        "# Analyzing Tabular Data with Pandas\n\nIn this notebook, we'll analyze a year of orders from an online store. We'll load the data, look at its structure, and find out which regions bring in the most revenue.",
      ),
      code("import pandas as pd\nimport matplotlib.pyplot as plt"),
      md(
        "## Loading the data\n\nThe `read_csv` function reads a CSV file into a **data frame**, a table with labeled rows and columns.",
      ),
      code('orders = pd.read_csv("orders-2024.csv", parse_dates=["order_date"])\norders.head()', [
        result({ "text/plain": head }),
      ]),
      code("orders.shape", [result({ "text/plain": "(48216, 6)" })]),
      md(
        "The data frame has 48,216 orders. Next, let's group the orders by region and add up the revenue of each group.",
      ),
      code('revenue_by_region = orders.groupby("region")["revenue"].sum()\nrevenue_by_region', [
        result({
          "text/plain": `region\n${REGIONS.map(([r, v]) => `${r.padEnd(8)} ${v.toFixed(2).padStart(12)}`).join("\n")}\nName: revenue, dtype: float64`,
        }),
      ]),
      md("A bar chart makes the comparison easier to see:"),
      code(
        'revenue_by_region.plot(kind="bar", title="Revenue by region (2024)", color="#4c72b0")\nplt.ylabel("Revenue ($)");',
        [
          {
            output_type: "display_data",
            metadata: {},
            data: {
              "image/svg+xml": barChart(),
              "text/plain": "<Figure size 640x400 with 1 Axes>",
            },
          },
        ],
      ),
      md(
        "The **West** region leads with about \\$1.52M in revenue, while the **South** trails at \\$0.86M. In the next lesson, we'll look at how revenue changes month by month.",
      ),
    ],
  }
}

function barChart(): string {
  const max = 1600000
  const bars = REGIONS.map(([region, value], i) => {
    const h = (value / max) * 260
    const x = 90 + i * 120
    return `<rect x="${x}" y="${320 - h}" width="70" height="${h}" fill="#4c72b0"/><text x="${x + 35}" y="342" text-anchor="middle" font-size="13">${region}</text>`
  }).join("")
  const ticks = [0, 400000, 800000, 1200000, 1600000]
    .map((t) => {
      const y = 320 - (t / max) * 260
      return `<line x1="60" x2="560" y1="${y}" y2="${y}" stroke="#e5e7eb"/><text x="52" y="${y + 4}" text-anchor="end" font-size="12">${t / 1e6}M</text>`
    })
    .join("")
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380" font-family="DejaVu Sans, Arial, sans-serif" fill="#262626">
<rect width="600" height="380" fill="white"/>
<text x="310" y="36" text-anchor="middle" font-size="15">Revenue by region (2024)</text>
${ticks}${bars}
<line x1="60" x2="560" y1="320" y2="320" stroke="#262626"/>
<text x="18" y="190" font-size="13" transform="rotate(-90 18 190)" text-anchor="middle">Revenue ($)</text>
<text x="310" y="368" text-anchor="middle" font-size="13">region</text>
</svg>`
}
