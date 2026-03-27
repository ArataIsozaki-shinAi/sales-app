// ============================================================
// AGGREGATE
// ============================================================
function aggregateSales(records) {
  // returns { [name]: { sales, deals, clients, team } }
  const map = {};
  for (const r of records) {
    if (!isValidStatus(r)) continue;
    const name = getAssigneeName(r);
    const team = getTeamName(r);
    const sales = getSales(r);
    if (!map[name]) map[name] = { sales: 0, deals: 0, _clientSet: new Set(), clients: 0, team };
    map[name].sales += sales;
    map[name].deals += 1;
    const client = getClientName(r);
    if (client) map[name]._clientSet.add(client);
  }
  for (const v of Object.values(map)) {
    v.clients = v._clientSet.size;
    delete v._clientSet;
  }
  return map;
}

function sortedRanking(agg, key = "sales") {
  return Object.entries(agg)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b[key] - a[key]);
}

