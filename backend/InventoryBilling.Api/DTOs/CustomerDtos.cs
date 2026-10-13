namespace InventoryBilling.Api.DTOs;

public record CustomerUpsertRequest(
    string Name,
    string? Phone,
    string? Email,
    string? Address,
    string? GstNumber
);
