namespace InventoryBilling.Api.DTOs;

public record VehicleUpsertRequest(
    string VehicleNumber,
    string? ExecutiveName,
    string? DriverName,
    string? DriverPhone,
    string? HelperName
);
