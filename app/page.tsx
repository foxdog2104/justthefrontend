"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Chart,
  BarController,
  BarElement,
  ScatterController,
  PieController,
  PointElement,
  LineElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

Chart.register(
  BarController,
  BarElement,
  ScatterController,
  PieController,
  PointElement,
  LineElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
);

type Recipe = {
  Recipe_name: string;
  Diet_type: string;
  Cuisine_type: string;
  "Protein(g)": number;
  "Carbs(g)": number;
  "Fat(g)": number;
};

type MacroRow = {
  Diet_type: string;
  "Protein(g)": number;
  "Carbs(g)": number;
  "Fat(g)": number;
};

const DIETS = ["paleo", "vegan", "keto", "mediterranean", "dash"];
const DIET_LABELS: Record<string, string> = {
  paleo: "Paleo",
  vegan: "Vegan",
  keto: "Keto",
  mediterranean: "Mediterranean",
  dash: "DASH",
};
const DIET_COLORS: Record<string, string> = {
  paleo: "#EF4444",
  vegan: "#22C55E",
  keto: "#3B82F6",
  mediterranean: "#F59E0B",
  dash: "#A855F7",
};

function rand(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

function generateRecipes(n: number): Recipe[] {
  const names = [
    "Lentil Bowl",
    "Grilled Salmon",
    "Zucchini Noodles",
    "Chicken Skewers",
    "Quinoa Salad",
    "Almond Crusted Tofu",
    "Roasted Chickpeas",
    "Beef & Broccoli",
    "Avocado Toast",
    "Stuffed Peppers",
    "Miso Soup",
    "Turkey Lettuce Wrap",
    "Sweet Potato Hash",
    "Shrimp Stir Fry",
    "Cauliflower Rice",
    "Black Bean Tacos",
    "Greek Salad",
    "Baked Cod",
    "Mushroom Risotto",
    "Falafel Plate",
    "Egg White Omelet",
    "Pesto Zoodles",
    "Pork Tenderloin",
    "Chia Pudding",
  ];
  const cuisines = [
    "american",
    "mediterranean",
    "italian",
    "french",
    "world",
    "british",
    "mexican",
    "nordic",
    "south east asian",
  ];
  const rows: Recipe[] = [];
  for (let i = 0; i < n; i++) {
    const diet = DIETS[i % DIETS.length];
    rows.push({
      Recipe_name: names[i % names.length] + (i >= names.length ? " II" : ""),
      Diet_type: diet,
      Cuisine_type: cuisines[i % cuisines.length],
      "Protein(g)": rand(8, 180),
      "Carbs(g)": rand(5, 300),
      "Fat(g)": rand(4, 150),
    });
  }
  return rows;
}

function generateBarData(): MacroRow[] {
  return DIETS.map((d) => ({
    Diet_type: d,
    "Protein(g)": rand(55, 105),
    "Carbs(g)": rand(55, 255),
    "Fat(g)": rand(100, 155),
  }));
}

function generateCorrelationMatrix(): number[][] {
  return [
    [1.0, -0.38, -0.21],
    [-0.38, 1.0, 0.24],
    [-0.21, 0.24, 1.0],
  ];
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type Status = { text: string; className: string };

export default function Home() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{
    email: string;
    name: string;
    provider: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((user) => setCurrentUser(user))
      .catch(() => setCurrentUser(null));
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const [apiBase, setApiBase] = useState("");
  const [allRecipes, setAllRecipes] = useState<Recipe[]>(() =>
    generateRecipes(24),
  );
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dietFilter, setDietFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Recipes table comes from server
  const [recipePage, setRecipePage] = useState<Recipe[]>([]);
  const [recipeTotal, setRecipeTotal] = useState(0);
  const [recipeTotalPages, setRecipeTotalPages] = useState(1);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [dietCounts, setDietCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(DIETS.map((d) => [d, 0])),
  );
  const [scatterData, setScatterData] = useState<
    Record<string, { x: number; y: number }[]>
  >(() => Object.fromEntries(DIETS.map((d) => [d, []])));

  const [barSource, setBarSource] = useState<MacroRow[]>(() =>
    generateBarData(),
  );
  const [correlation, setCorrelation] = useState<number[][]>(() =>
    generateCorrelationMatrix(),
  );

  const [status, setStatusState] = useState<Status>({
    text: "Demo mode",
    className: "bg-yellow-600",
  });
  const [execTime, setExecTime] = useState("—");
  const [rowsProcessed, setRowsProcessed] = useState("—");
  const [apiLog, setApiLog] = useState<string[]>([]);
  const [buttonsDisabled, setButtonsDisabled] = useState(false);

  const barCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scatterCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pieCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const barChartRef = useRef<Chart | null>(null);
  const scatterChartRef = useRef<Chart | null>(null);
  const pieChartRef = useRef<Chart | null>(null);

  const filteredRecipes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRecipes.filter((r) => {
      const matchesDiet = dietFilter === "all" || r.Diet_type === dietFilter;
      const matchesSearch =
        !q ||
        r.Recipe_name.toLowerCase().includes(q) ||
        r.Diet_type.toLowerCase().includes(q) ||
        (r.Cuisine_type || "").toLowerCase().includes(q);
      return matchesDiet && matchesSearch;
    });
  }, [allRecipes, search, dietFilter]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, dietFilter]);

  function log(tag: string, text: string) {
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setApiLog((prev) => [`[${time}] ${tag}: ${text}`, ...prev]);
  }

  function setStatus(text: string, className: string) {
    setStatusState({ text, className });
  }

  function stampMetadata(ms: number, rows: number | string) {
    setExecTime(`${ms} ms`);
    setRowsProcessed(String(rows));
  }

  // Init charts once
  useEffect(() => {
    if (barCanvasRef.current) {
      barChartRef.current = new Chart(barCanvasRef.current, {
        type: "bar",
        data: {
          labels: [],
          datasets: [
            { label: "Protein(g)", backgroundColor: "#3B82F6", data: [] },
            { label: "Carbs(g)", backgroundColor: "#F59E0B", data: [] },
            { label: "Fat(g)", backgroundColor: "#22C55E", data: [] },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: { boxWidth: 10, font: { size: 10 } },
            },
          },
        },
      });
    }
    if (scatterCanvasRef.current) {
      scatterChartRef.current = new Chart(scatterCanvasRef.current, {
        type: "scatter",
        data: {
          datasets: DIETS.map((d) => ({
            label: DIET_LABELS[d],
            data: [] as { x: number; y: number }[],
            backgroundColor: DIET_COLORS[d],
            pointRadius: 4,
          })),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: { boxWidth: 10, font: { size: 9 } },
            },
          },
          scales: {
            x: { title: { display: true, text: "Protein (g)" } },
            y: { title: { display: true, text: "Carbs (g)" } },
          },
        },
      });
    }
    if (pieCanvasRef.current) {
      pieChartRef.current = new Chart(pieCanvasRef.current, {
        type: "pie",
        data: {
          labels: DIETS.map((d) => DIET_LABELS[d]),
          datasets: [
            { data: [], backgroundColor: DIETS.map((d) => DIET_COLORS[d]) },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: { boxWidth: 10, font: { size: 9 } },
            },
          },
        },
      });
    }
    return () => {
      barChartRef.current?.destroy();
      scatterChartRef.current?.destroy();
      pieChartRef.current?.destroy();
    };
  }, []);

  // Update bar chart when barSource changes
  useEffect(() => {
    const chart = barChartRef.current;
    if (!chart) return;
    chart.data.labels = barSource.map(
      (b) => DIET_LABELS[b.Diet_type] || b.Diet_type,
    );
    chart.data.datasets[0].data = barSource.map((b) => b["Protein(g)"]);
    chart.data.datasets[1].data = barSource.map((b) => b["Carbs(g)"]);
    chart.data.datasets[2].data = barSource.map((b) => b["Fat(g)"]);
    chart.update();
  }, [barSource]);

  // (scatter plot now driven by real backend sampling -- see below)

  // Fetche he Recipes table from server whene  API base, diet filter search term, or page number changes.
  useEffect(() => {
    let cancelled = false;

    async function fetchRecipesPage() {
      setRecipesLoading(true);
      const started = performance.now();

      if (!apiBase) {
        await sleep(200 + Math.random() * 150);
        if (cancelled) return;
        const q = debouncedSearch.trim().toLowerCase();
        const demo = generateRecipes(48).filter((r) => {
          const matchesDiet =
            dietFilter === "all" || r.Diet_type === dietFilter;
          const matchesSearch =
            !q ||
            r.Recipe_name.toLowerCase().includes(q) ||
            r.Diet_type.toLowerCase().includes(q) ||
            (r.Cuisine_type || "").toLowerCase().includes(q);
          return matchesDiet && matchesSearch;
        });
        const total = demo.length;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const safePage = Math.min(currentPage, totalPages);
        setRecipePage(
          demo.slice((safePage - 1) * pageSize, safePage * pageSize),
        );
        setRecipeTotal(total);
        setRecipeTotalPages(totalPages);
        const ms = Math.round(performance.now() - started);
        stampMetadata(ms, total);
        setStatus("Demo mode", "bg-yellow-600");
        log(
          "DEMO",
          `/api/recipes — no Azure Function URL set, showing generated sample data (${ms} ms)`,
        );
        setRecipesLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          pageSize: String(pageSize),
        });
        if (dietFilter !== "all") params.set("diet", dietFilter);
        if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(
          apiBase.replace(/\/$/, "") + "/api/api/recipes?" + params.toString(),
          {
            signal: controller.signal,
          },
        );
        clearTimeout(timeout);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        if (cancelled) return;

        setRecipePage(Array.isArray(data.results) ? data.results : []);
        setRecipeTotal(typeof data.total === "number" ? data.total : 0);
        setRecipeTotalPages(
          typeof data.totalPages === "number" ? data.totalPages : 1,
        );

        const ms = Math.round(performance.now() - started);
        stampMetadata(ms, data.total ?? 0);
        setStatus("Live · connected", "bg-green-700");
        log(
          "OK",
          `/api/recipes responded in ${ms} ms (page ${currentPage} of ${data.totalPages ?? 1})`,
        );
      } catch (err: any) {
        if (cancelled) return;
        const ms = Math.round(performance.now() - started);
        setStatus("Connection failed", "bg-red-700");
        log(
          "ERR",
          `/api/recipes — ${err.message}. Check the Function URL and CORS settings.`,
        );
        stampMetadata(ms, 0);
      }
      setRecipesLoading(false);
    }

    fetchRecipesPage();
    return () => {
      cancelled = true;
    };
  }, [apiBase, dietFilter, debouncedSearch, currentPage]);
  useEffect(() => {
    let cancelled = false;

    async function fetchDietCounts() {
      if (!apiBase) {
        const counts: Record<string, number> = {};
        DIETS.forEach((d) => (counts[d] = 0));
        filteredRecipes.forEach((r) => {
          if (counts[r.Diet_type] !== undefined) counts[r.Diet_type]++;
        });
        if (!cancelled) setDietCounts(counts);
        return;
      }

      try {
        const results = await Promise.all(
          DIETS.map(async (d) => {
            const params = new URLSearchParams({
              diet: d,
              page: "1",
              pageSize: "1",
            });
            const res = await fetch(
              apiBase.replace(/\/$/, "") +
                "/api/api/recipes?" +
                params.toString(),
            );
            if (!res.ok) throw new Error("HTTP " + res.status);
            const data = await res.json();
            return [
              d,
              typeof data.total === "number" ? data.total : 0,
            ] as const;
          }),
        );
        if (cancelled) return;
        setDietCounts(Object.fromEntries(results));
        log(
          "OK",
          `/api/recipes diet counts loaded for pie chart (${results.length} diets)`,
        );
      } catch (err: any) {
        if (cancelled) return;
        log("ERR", `pie chart diet counts — ${err.message}`);
      }
    }

    fetchDietCounts();
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  // Push dietCounts into  Pie chart on update.
  useEffect(() => {
    const pie = pieChartRef.current;
    if (!pie) return;
    pie.data.datasets[0].data = DIETS.map((d) => dietCounts[d] || 0);
    pie.update();
  }, [dietCounts]);

  // Fetches a random sample of recipes per diet for the Scatter plot
  // (Protein vs Carbs). Uses the backend's random=true sampling so the
  // spread is representative rather than just the first N rows in CSV order.
  useEffect(() => {
    let cancelled = false;

    async function fetchScatterSample() {
      if (!apiBase) {
        const byDiet: Record<string, { x: number; y: number }[]> = {};
        DIETS.forEach((d) => (byDiet[d] = []));
        filteredRecipes.forEach((r) => {
          if (byDiet[r.Diet_type])
            byDiet[r.Diet_type].push({ x: r["Protein(g)"], y: r["Carbs(g)"] });
        });
        if (!cancelled) setScatterData(byDiet);
        return;
      }

      try {
        const results = await Promise.all(
          DIETS.map(async (d) => {
            const params = new URLSearchParams({
              diet: d,
              pageSize: "50",
              random: "true",
            });
            const res = await fetch(
              apiBase.replace(/\/$/, "") +
                "/api/api/recipes?" +
                params.toString(),
            );
            if (!res.ok) throw new Error("HTTP " + res.status);
            const data = await res.json();
            const points = Array.isArray(data.results)
              ? data.results.map((r: any) => ({
                  x: r["Protein(g)"],
                  y: r["Carbs(g)"],
                }))
              : [];
            return [d, points] as const;
          }),
        );
        if (cancelled) return;
        setScatterData(Object.fromEntries(results));
        log(
          "OK",
          `/api/recipes random samples loaded for scatter plot (${results.length} diets)`,
        );
      } catch (err: any) {
        if (cancelled) return;
        log("ERR", `scatter plot sample — ${err.message}`);
      }
    }

    fetchScatterSample();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  // Push scatterData into the Scatter chart whenever it updates.
  useEffect(() => {
    const scatter = scatterChartRef.current;
    if (!scatter) return;
    scatter.data.datasets.forEach((ds: any) => {
      const dietKey = DIETS.find((d) => DIET_LABELS[d] === ds.label);
      ds.data = (dietKey && scatterData[dietKey]) || [];
    });
    scatter.update();
  }, [scatterData]);

  async function callFunction<T>(
    route: string,
    onSuccess: (data: T) => void,
    demoRows: T,
  ) {
    setButtonsDisabled(true);
    const started = performance.now();

    if (!apiBase) {
      await sleep(300 + Math.random() * 250);
      const ms = Math.round(performance.now() - started);
      onSuccess(demoRows);
      stampMetadata(
        ms,
        Array.isArray(demoRows) ? demoRows.length : (demoRows as any),
      );
      setStatus("Demo mode", "bg-yellow-600");
      log(
        "DEMO",
        `${route} — no Azure Function URL set, showing generated sample data (${ms} ms)`,
      );
      setButtonsDisabled(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(apiBase.replace(/\/$/, "") + "/api" + route, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const ms = Math.round(performance.now() - started);
      onSuccess(data);
      stampMetadata(
        ms,
        Array.isArray(data)
          ? data.length
          : (data?.rows ??
              (Array.isArray(demoRows) ? demoRows.length : demoRows)),
      );
      setStatus("Live · connected", "bg-green-700");
      log("OK", `${route} responded in ${ms} ms`);
    } catch (err: any) {
      const ms = Math.round(performance.now() - started);
      setStatus("Connection failed", "bg-red-700");
      log(
        "ERR",
        `${route} — ${err.message}. Check the Function URL and CORS settings.`,
      );
      stampMetadata(ms, 0);
    }
    setButtonsDisabled(false);
  }

  function handleInsights() {
    callFunction<any>(
      "/api/insights",
      (data) => {
        if (data && Array.isArray(data.averages)) {
          setBarSource(data.averages);
          setCorrelation(
            Array.isArray(data.correlation)
              ? data.correlation
              : generateCorrelationMatrix(),
          );
        } else {
          setBarSource(generateBarData());
          setCorrelation(generateCorrelationMatrix());
        }
      },
      generateBarData(),
    );
  }

  function handleClusters() {
    callFunction<any>(
      "/api/clusters",
      (data) => {
        if (data && Array.isArray(data.clusters)) {
          setBarSource(
            data.clusters.map((c: any) => ({
              Diet_type: `Cluster ${c.cluster}`,
              "Protein(g)": c["Protein(g)"],
              "Carbs(g)": c["Carbs(g)"],
              "Fat(g)": c["Fat(g)"],
            })),
          );
          log("INFO", `k-means returned ${data.clusters.length} clusters`);
        } else {
          setBarSource(generateBarData());
        }
      },
      generateBarData(),
    );
  }

  const totalPages = recipeTotalPages;
  const pageSafe = Math.min(currentPage, totalPages);
  const pageRows = recipePage;

  return (
    <div className="flex flex-col flex-1 bg-gray-100 min-h-screen">
      <header className="bg-blue-600 p-4 text-white">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">Nutritional Insights</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className={`px-2 py-1 rounded ${status.className}`}>
              {status.text}
            </span>
            <span>Last run: {execTime}</span>
            <span>Rows: {rowsProcessed}</span>
            {currentUser && (
              <span className="flex items-center gap-2 pl-3 ml-1 border-l border-blue-400">
                <span>{currentUser.name}</span>
                <button
                  onClick={handleLogout}
                  className="bg-blue-800 hover:bg-blue-900 text-white text-xs py-1 px-3 rounded"
                >
                  Logout
                </button>
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6 flex-1 w-full">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Explore Nutritional Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-4 shadow-lg rounded-lg">
              <h3 className="font-semibold">Bar Chart</h3>
              <p className="text-sm text-gray-600">
                Average macronutrient content by diet type.
              </p>
              <div className="relative w-full h-48">
                <canvas ref={barCanvasRef} />
              </div>
            </div>

            <div className="bg-white p-4 shadow-lg rounded-lg">
              <h3 className="font-semibold">Scatter Plot</h3>
              <p className="text-sm text-gray-600">
                Nutrient relationships (e.g., protein vs carbs).
              </p>
              <div className="relative w-full h-48">
                <canvas ref={scatterCanvasRef} />
              </div>
            </div>

            <div className="bg-white p-4 shadow-lg rounded-lg">
              <h3 className="font-semibold">Heatmap</h3>
              <p className="text-sm text-gray-600">Nutrient correlations.</p>
              <div className="w-full h-48 flex items-center justify-center gap-1">
                <div
                  className="grid grid-cols-3 gap-[3px]"
                  style={{ width: 150 }}
                >
                  {correlation.flat().map((v, i) => {
                    const intensity = Math.abs(v);
                    const positive = v >= 0;
                    const bg = positive
                      ? `rgba(59,130,246,${0.15 + intensity * 0.75})`
                      : `rgba(245,158,11,${0.15 + intensity * 0.75})`;
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-center rounded"
                        style={{
                          background: bg,
                          aspectRatio: "1",
                          fontSize: 10,
                          color: intensity > 0.5 ? "#fff" : "#1f2937",
                        }}
                      >
                        {v.toFixed(2)}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-white p-4 shadow-lg rounded-lg">
              <h3 className="font-semibold">Pie Chart</h3>
              <p className="text-sm text-gray-600">
                Recipe distribution by diet type.
              </p>
              <div className="relative w-full h-48">
                <canvas ref={pieCanvasRef} />
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Filters and Data Interaction
          </h2>
          <div className="flex flex-wrap gap-4">
            <input
              type="text"
              placeholder="Search by Recipe, Diet, or Cuisine"
              className="p-2 border rounded w-full sm:w-auto"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="p-2 border rounded w-full sm:w-auto"
              value={dietFilter}
              onChange={(e) => setDietFilter(e.target.value)}
            >
              <option value="all">All Diet Types</option>
              <option value="paleo">Paleo</option>
              <option value="vegan">Vegan</option>
              <option value="keto">Keto</option>
              <option value="mediterranean">Mediterranean</option>
              <option value="dash">DASH</option>
            </select>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">API Data Interaction</h2>
          <div className="flex flex-wrap gap-4 mb-3">
            <input
              type="text"
              placeholder="Azure Function base URL (e.g. https://your-app.azurewebsites.net)"
              className="p-2 border rounded flex-1 min-w-[280px] text-sm"
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value.trim())}
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <button
              disabled={buttonsDisabled}
              onClick={handleInsights}
              className="bg-blue-600 text-white py-2 px-4 rounded disabled:opacity-50"
            >
              Get Nutritional Insights
            </button>
            <button
              disabled={buttonsDisabled}
              onClick={handleClusters}
              className="bg-purple-600 text-white py-2 px-4 rounded disabled:opacity-50"
            >
              Get Clusters
            </button>
          </div>
          <div className="mt-3 text-xs text-gray-500 font-mono">
            {apiLog.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Recipes{" "}
            <span className="text-base font-normal text-gray-500">
              ({recipeTotal} matching)
            </span>
          </h2>
          <div className="bg-white shadow-lg rounded-lg overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="p-3">Recipe</th>
                  <th className="p-3">Diet</th>
                  <th className="p-3">Cuisine</th>
                  <th className="p-3">Protein (g)</th>
                  <th className="p-3">Carbs (g)</th>
                  <th className="p-3">Fat (g)</th>
                </tr>
              </thead>
              <tbody>
                {recipesLoading ? (
                  <tr>
                    <td colSpan={6} className="p-3 text-gray-400">
                      Loading recipes…
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-3 text-gray-400">
                      No recipes match. Try a different search or diet filter.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-3">{r.Recipe_name}</td>
                      <td className="p-3">
                        {DIET_LABELS[r.Diet_type] || r.Diet_type}
                      </td>
                      <td className="p-3">{r.Cuisine_type || "—"}</td>
                      <td className="p-3">{r["Protein(g)"]}</td>
                      <td className="p-3">{r["Carbs(g)"]}</td>
                      <td className="p-3">{r["Fat(g)"]}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Pagination</h2>
          <div className="flex justify-center gap-2 mt-4 flex-wrap">
            <button
              className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-40"
              disabled={pageSafe === 1}
              onClick={() => setCurrentPage(pageSafe - 1)}
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(
              (p) => (
                <button
                  key={p}
                  className={
                    p === pageSafe
                      ? "px-3 py-1 bg-blue-600 text-white rounded"
                      : "px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
                  }
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              ),
            )}
            <button
              className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-40"
              disabled={pageSafe === totalPages}
              onClick={() => setCurrentPage(pageSafe + 1)}
            >
              Next
            </button>
          </div>
        </section>
      </main>

      <footer className="bg-blue-600 p-4 text-white text-center mt-10">
        <p>&copy; 2026 Nutritional Insights. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
