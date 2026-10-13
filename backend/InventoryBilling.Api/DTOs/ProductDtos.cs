namespace InventoryBilling.Api.DTOs;

public record ProductUpsertRequest(
    string Name,
    string? Sku,
    string? Description,
    string? Category,
    string Unit,
    decimal PurchasePrice,
    decimal SellingPrice,
    decimal TaxPercent,
    int StockQuantity,
    int LowStockThreshold
);

public record StockAdjustRequest(int Delta, string? Reason);
