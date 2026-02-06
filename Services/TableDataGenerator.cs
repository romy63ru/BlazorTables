using BlazorTables.Models;
using System.Globalization;

namespace BlazorTables.Services;

public sealed class TableDataGenerator
{
    private static readonly string[] Roles = ["Admin", "Editor", "Viewer", "Reviewer"];
    private static readonly string[] Statuses = ["Healthy", "Warning", "Offline"];
    private static readonly string[] Owners = ["Alex", "Sam", "Taylor", "Jordan"];

    private readonly IReadOnlyList<TableRow> rows;
    private IReadOnlyList<ScatterMatrixPoint>? scatterMatrixData;

    public TableDataGenerator()
    {
        rows = GenerateRows();
    }

    public IReadOnlyList<TableRow> GetRows() => rows;

    public IEnumerable<TableSubRow> GetSubRows(int parentId)
    {
        return Enumerable.Range(1, 100)
            .Select(id => new TableSubRow(
                id,
                $"P{parentId:000}-Component-{id:000}",
                Statuses[(parentId + id) % Statuses.Length],
                Owners[(id - 1) % Owners.Length]));
    }

    public IEnumerable<TableDetailRow> GetDetailRows(int parentId, int childId)
    {
        return Enumerable.Range(1, 100)
            .Select(id => new TableDetailRow(
                id,
                $"P{parentId:000}-C{childId:000}-Metric-{id:000}",
                $"{((parentId * childId * id) % 100) + 1}%",
                Owners[(parentId + childId + id) % Owners.Length]));
    }

    public SunburstNode GetSunburstData()
    {
        var buckets = new Dictionary<string, Dictionary<string, Dictionary<string, double>>>(StringComparer.Ordinal);

        foreach (var row in rows)
        {
            foreach (var subRow in GetSubRows(row.Id))
            {
                if (!buckets.TryGetValue(row.Role, out var roleBucket))
                {
                    roleBucket = new Dictionary<string, Dictionary<string, double>>(StringComparer.Ordinal);
                    buckets[row.Role] = roleBucket;
                }

                if (!roleBucket.TryGetValue(subRow.Status, out var statusBucket))
                {
                    statusBucket = new Dictionary<string, double>(StringComparer.Ordinal);
                    roleBucket[subRow.Status] = statusBucket;
                }

                if (!statusBucket.TryGetValue(subRow.Owner, out var count))
                {
                    statusBucket[subRow.Owner] = 1;
                }
                else
                {
                    statusBucket[subRow.Owner] = count + 1;
                }
            }
        }

        var roleNodes = buckets
            .OrderBy(role => role.Key, StringComparer.Ordinal)
            .Select(role => new SunburstNode(
                role.Key,
                Children: role.Value
                    .OrderBy(status => status.Key, StringComparer.Ordinal)
                    .Select(status => new SunburstNode(
                        status.Key,
                        Children: status.Value
                            .OrderBy(owner => owner.Key, StringComparer.Ordinal)
                            .Select(owner => new SunburstNode(owner.Key, owner.Value))
                            .ToList()))
                    .ToList()))
            .ToList();

        return new SunburstNode("Generated Table Data", Children: roleNodes);
    }

    public IReadOnlyList<ScatterMatrixPoint> GetScatterMatrixData()
    {
        if (scatterMatrixData is not null)
        {
            return scatterMatrixData;
        }

        var points = new List<ScatterMatrixPoint>(rows.Count);

        foreach (var row in rows)
        {
            var healthyCount = 0;
            var warningCount = 0;
            var offlineCount = 0;
            var detailSum = 0.0;
            var detailCount = 0;
            var highDetailCount = 0;

            foreach (var subRow in GetSubRows(row.Id))
            {
                switch (subRow.Status)
                {
                    case "Healthy":
                        healthyCount++;
                        break;
                    case "Warning":
                        warningCount++;
                        break;
                    default:
                        offlineCount++;
                        break;
                }

                foreach (var detail in GetDetailRows(row.Id, subRow.Id))
                {
                    var value = ParsePercentValue(detail.Value);
                    detailSum += value;
                    detailCount++;

                    if (value >= 80)
                    {
                        highDetailCount++;
                    }
                }
            }

            var avgDetailValue = detailCount == 0 ? 0 : detailSum / detailCount;
            var highDetailRate = detailCount == 0 ? 0 : (100.0 * highDetailCount) / detailCount;

            points.Add(new ScatterMatrixPoint(
                row.Id,
                row.Role,
                row.IsActive,
                healthyCount,
                warningCount,
                offlineCount,
                avgDetailValue,
                highDetailRate));
        }

        scatterMatrixData = points;
        return scatterMatrixData;
    }

    private static IReadOnlyList<TableRow> GenerateRows()
    {
        return Enumerable.Range(1, 100)
            .Select(id => new TableRow(
                id,
                $"User {id:000}",
                Roles[(id - 1) % Roles.Length],
                id % 2 == 0))
            .ToList();
    }

    private static double ParsePercentValue(string text)
    {
        if (double.TryParse(text.TrimEnd('%'), NumberStyles.Float, CultureInfo.InvariantCulture, out var value))
        {
            return value;
        }

        return 0;
    }
}
