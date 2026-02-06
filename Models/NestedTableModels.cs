namespace BlazorTables.Models;

public sealed record TableRow(int Id, string Name, string Role, bool IsActive);

public sealed record TableSubRow(int Id, string Component, string Status, string Owner);

public sealed record TableDetailRow(int Id, string Metric, string Value, string UpdatedBy);

public sealed record SunburstNode(string Name, double? Value = null, IReadOnlyList<SunburstNode>? Children = null);

public sealed record ScatterMatrixPoint(
    int Id,
    string Role,
    bool IsActive,
    double HealthySubRows,
    double WarningSubRows,
    double OfflineSubRows,
    double AvgDetailValue,
    double HighDetailRate);
