const metricsState = {
  startedAt: Date.now(),
  totalRequests: 0,
  status: {
    "2xx": 0,
    "3xx": 0,
    "4xx": 0,
    "5xx": 0,
  },
  routes: {},
};

const classifyStatus = (statusCode) => {
  if (statusCode >= 500) return "5xx";
  if (statusCode >= 400) return "4xx";
  if (statusCode >= 300) return "3xx";
  return "2xx";
};

const metricsMiddleware = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    metricsState.totalRequests += 1;

    const statusBucket = classifyStatus(res.statusCode);
    metricsState.status[statusBucket] += 1;

    const routeKey = `${req.method} ${req.baseUrl || ""}${req.path}`;
    if (!metricsState.routes[routeKey]) {
      metricsState.routes[routeKey] = {
        count: 0,
        totalMs: 0,
      };
    }

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    metricsState.routes[routeKey].count += 1;
    metricsState.routes[routeKey].totalMs += durationMs;
  });

  next();
};

const getMetricsSnapshot = () => {
  const routes = Object.entries(metricsState.routes)
    .map(([route, data]) => ({
      route,
      count: data.count,
      avgResponseMs: Number((data.totalMs / data.count).toFixed(2)),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  return {
    startedAt: new Date(metricsState.startedAt).toISOString(),
    uptimeSeconds: Math.floor((Date.now() - metricsState.startedAt) / 1000),
    totalRequests: metricsState.totalRequests,
    status: metricsState.status,
    topRoutes: routes,
  };
};

export { metricsMiddleware, getMetricsSnapshot };
