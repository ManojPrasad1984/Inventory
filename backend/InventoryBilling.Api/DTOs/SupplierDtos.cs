namespace InventoryBilling.Api.DTOs;

public record SupplierUpsertRequest(string Name, string? Phone, string? Address, string? GstNumber);
